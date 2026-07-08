#!/usr/bin/env bash

set -euo pipefail

phase_set="${1:-all}"
artifact_root="${2:-$PWD/perf-local/$(date -u +%Y%m%dT%H%M%SZ)}"

case "$phase_set" in
  all|reads|writes)
    ;;
  *)
    echo "Usage: $0 [all|reads|writes] [artifact-dir]" >&2
    exit 1
    ;;
esac

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd npm
require_cmd node
require_cmd curl

export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-local-admin-password}"
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:55432/traffic_data}"
export POSTGREST_BASE_URL="${POSTGREST_BASE_URL:-http://localhost:3001}"
export POSTGREST_JWT_SECRET="${POSTGREST_JWT_SECRET:-super-secret-admin-key-for-local-dev-32}"
export POSTGREST_ANON_ROLE="${POSTGREST_ANON_ROLE:-web_anon}"
export POSTGREST_ADMIN_ROLE="${POSTGREST_ADMIN_ROLE:-traffic_admin}"
export FRONTEND_DIST_DIR="${FRONTEND_DIST_DIR:-/app/frontend/dist}"

app_url="${APP_URL:-http://localhost:3000}"
postgrest_url="${POSTGREST_URL:-http://localhost:3001}"
admin_api_url="${ADMIN_API_URL:-$app_url}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

mkdir -p "$artifact_root"

wait_for_url() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "Timed out waiting for ${label}: ${url}" >&2
  exit 1
}

containerize_url() {
  local url="$1"
  url="${url/localhost/host.docker.internal}"
  url="${url/127.0.0.1/host.docker.internal}"
  printf '%s\n' "$url"
}

capture_local_metrics() {
  local output_dir="$1"
  mkdir -p "$output_dir"

  if ! docker compose ps >"$output_dir/docker-compose-ps.txt" 2>&1; then
    printf 'command_failed\n' >>"$output_dir/docker-compose-ps.txt"
  fi

  if ! docker stats --no-stream >"$output_dir/docker-stats.txt" 2>&1; then
    printf 'command_failed\n' >>"$output_dir/docker-stats.txt"
  fi

  if ! docker compose exec -T postgres psql -U postgres -d traffic_data -c \
    "select now() as captured_at, state, count(*) as sessions from pg_stat_activity group by state order by state nulls last;" \
    >"$output_dir/postgres-activity.txt" 2>&1; then
    printf 'command_failed\n' >>"$output_dir/postgres-activity.txt"
  fi

  curl -fsS "$app_url/system/runtime" >"$output_dir/system-runtime.json" || printf 'command_failed\n' >"$output_dir/system-runtime.json"
  curl -fsS "$app_url/health/ready" >"$output_dir/health-ready.json" || printf 'command_failed\n' >"$output_dir/health-ready.json"
  curl -fsS "$postgrest_url/country_traffic_latest?select=country_code&limit=3" >"$output_dir/postgrest-country-head.txt" || printf 'command_failed\n' >"$output_dir/postgrest-country-head.txt"
  curl -fsS "$postgrest_url/vehicle_type_distribution_latest?select=vehicle_type_slug&limit=3" >"$output_dir/postgrest-vehicle-head.txt" || printf 'command_failed\n' >"$output_dir/postgrest-vehicle-head.txt"

  cat >"$output_dir/metadata.json" <<EOF
{
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "appUrl": "$app_url",
  "postgrestUrl": "$postgrest_url",
  "phaseSet": "$phase_set",
  "mode": "local"
}
EOF
}

run_phase() {
  local scenario="$1"
  local phase_name="$2"
  local target_rps="$3"
  local duration="$4"
  local max_p95="$5"
  local phase_dir="$artifact_root/$phase_name"
  local summary_path="$phase_dir/summary.json"
  local summary_path_container="/work/${summary_path#"$repo_root"/}"
  local base_time_period=300000

  mkdir -p "$phase_dir/metrics"

  local script_path="/work/perf/k6-dashboard.js"
  local k6_postgrest_url
  k6_postgrest_url="$(containerize_url "$postgrest_url")"
  local env_args=(
    -e TARGET_BASE_URL="$k6_postgrest_url"
  )

  if [ "$scenario" = "write" ]; then
    case "$phase_name" in
      write-rps-5)
        base_time_period=300000
        ;;
      write-rps-50)
        base_time_period=400000
        ;;
      write-rps-500)
        base_time_period=500000
        ;;
    esac

    script_path="/work/perf/k6-admin-writes.js"
    env_args=(
      -e POSTGREST_URL="$k6_postgrest_url"
      -e ADMIN_TOKEN="$admin_token"
      -e COUNTRY_ID="$country_id"
      -e VEHICLE_TYPE_ID="$vehicle_type_id"
      -e BASE_TIME_PERIOD="$base_time_period"
    )
  fi

  set +e
  docker run --rm \
    --add-host host.docker.internal:host-gateway \
    --user "$(id -u):$(id -g)" \
    -v "$repo_root:/work" \
    -w /work \
    grafana/k6 run \
    --summary-export "$summary_path_container" \
    "${env_args[@]}" \
    -e PHASE_NAME="$phase_name" \
    -e TARGET_RPS="$target_rps" \
    -e DURATION="$duration" \
    -e MAX_P95_MS="$max_p95" \
    -e MAX_FAILURE_RATE="0.01" \
    "$script_path"
  local phase_status="$?"
  set -e

  capture_local_metrics "$phase_dir/metrics"

  if [ "$phase_status" -ne 0 ]; then
    benchmark_failed=true
  fi
}

benchmark_failed=false
admin_token=""
country_id=""
vehicle_type_id=""

cd "$repo_root"
docker compose up -d postgres postgrest api
wait_for_url "$app_url/health/ready" "api health"
wait_for_url "$postgrest_url/country_traffic_latest?select=country_code&limit=1" "postgrest read path"

npm --prefix backend run db:migrate
npm --prefix backend run seed:traffic-data

admin_token="$(
  node --input-type=module -e \
    "import jwt from './backend/node_modules/jsonwebtoken/index.js'; console.log(jwt.sign({ role: process.env.POSTGREST_ADMIN_ROLE }, process.env.POSTGREST_JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' }));"
)"

country_id="$(
  curl -fsS \
    -H "Authorization: Bearer $admin_token" \
    "$postgrest_url/countries?select=id&order=id.asc&limit=1" |
    node --input-type=module -e "const payload = JSON.parse(await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); })); if (!Array.isArray(payload) || payload.length === 0) throw new Error('No country seed rows found'); console.log(payload[0].id);"
)"

vehicle_type_id="$(
  curl -fsS \
    -H "Authorization: Bearer $admin_token" \
    "$postgrest_url/vehicle_types?select=id&order=id.asc&limit=1" |
    node --input-type=module -e "const payload = JSON.parse(await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); })); if (!Array.isArray(payload) || payload.length === 0) throw new Error('No vehicle type seed rows found'); console.log(payload[0].id);"
)"

if [ "$phase_set" = "all" ] || [ "$phase_set" = "reads" ]; then
  run_phase "read" "read-rps-5" 5 "20s" 800
  run_phase "read" "read-rps-50" 50 "30s" 1200
  run_phase "read" "read-rps-500" 500 "45s" 2500
fi

if [ "$phase_set" = "all" ] || [ "$phase_set" = "writes" ]; then
  run_phase "write" "write-rps-5" 5 "20s" 800
  run_phase "write" "write-rps-50" 50 "30s" 1200
  run_phase "write" "write-rps-500" 500 "45s" 2500
fi

manifest_path="$artifact_root/manifest.json"

cat >"$manifest_path" <<EOF
{
  "size": "local-docker-compose",
  "dropletId": "local",
  "dropletIp": "127.0.0.1",
  "appUrl": "$app_url",
  "postgrestUrl": "$postgrest_url",
  "phases": [
EOF

phase_count=0
for phase_dir in "$artifact_root"/*/; do
  phase_name="$(basename "$phase_dir")"
  case "$phase_name" in
    read-rps-5)
      target_rps=5
      duration="20s"
      max_p95=800
      ;;
    read-rps-50)
      target_rps=50
      duration="30s"
      max_p95=1200
      ;;
    read-rps-500)
      target_rps=500
      duration="45s"
      max_p95=2500
      ;;
    write-rps-5)
      target_rps=5
      duration="20s"
      max_p95=800
      ;;
    write-rps-50)
      target_rps=50
      duration="30s"
      max_p95=1200
      ;;
    write-rps-500)
      target_rps=500
      duration="45s"
      max_p95=2500
      ;;
    *)
      continue
      ;;
  esac

  if [ "$phase_count" -gt 0 ]; then
    printf ',\n' >>"$manifest_path"
  fi

  cat >>"$manifest_path" <<EOF
    {
      "name": "$phase_name",
      "targetRps": $target_rps,
      "duration": "$duration",
      "summaryPath": "$artifact_root/$phase_name/summary.json",
      "metricsDir": "$artifact_root/$phase_name/metrics",
      "maxP95Ms": $max_p95,
      "maxFailureRate": 0.01
    }
EOF
  phase_count=$((phase_count + 1))
done

cat >>"$manifest_path" <<EOF
  ]
}
EOF

node perf/summarize-results.mjs --manifest "$manifest_path" --output "$artifact_root/result.json"

if [ "$benchmark_failed" = true ]; then
  exit 1
fi
