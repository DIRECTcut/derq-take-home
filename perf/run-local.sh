#!/usr/bin/env bash

set -euo pipefail

phase_set="${1:-all}"
profile="${2:-standard}"
artifact_root="${3:-$PWD/perf-local/$(date -u +%Y%m%dT%H%M%SZ)}"

case "$phase_set" in
  all|reads|writes)
    ;;
  *)
    echo "Usage: $0 [all|reads|writes] [standard|capacity] [artifact-dir]" >&2
    exit 1
    ;;
esac

case "$profile" in
  standard|capacity)
    ;;
  *)
    echo "Usage: $0 [all|reads|writes] [standard|capacity] [artifact-dir]" >&2
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
export ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET:-super-secret-admin-key-for-local-dev-32}"
export DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:55432/traffic_data}"
export FRONTEND_DIST_DIR="${FRONTEND_DIST_DIR:-/app/frontend/dist}"

if [ "$profile" = "capacity" ]; then
  think_time_seconds="${THINK_TIME_SECONDS:-0}"
  : "${DATABASE_POOL_MAX:=50}"
  : "${DATABASE_POOL_CONNECTION_TIMEOUT_MS:=30000}"
  : "${PG_MAX_CONNECTIONS:=200}"
  : "${PG_SHARED_BUFFERS:=256MB}"
  : "${PG_WORK_MEM:=8MB}"
  : "${PG_MAINTENANCE_WORK_MEM:=128MB}"
  : "${PG_EFFECTIVE_CACHE_SIZE:=768MB}"
  : "${PG_CHECKPOINT_COMPLETION_TARGET:=0.9}"
  : "${PG_WAL_BUFFERS:=16MB}"
else
  think_time_seconds="${THINK_TIME_SECONDS:-0.1}"
  : "${DATABASE_POOL_MAX:=10}"
  : "${DATABASE_POOL_CONNECTION_TIMEOUT_MS:=10000}"
  : "${PG_MAX_CONNECTIONS:=100}"
  : "${PG_SHARED_BUFFERS:=128MB}"
  : "${PG_WORK_MEM:=4MB}"
  : "${PG_MAINTENANCE_WORK_MEM:=64MB}"
  : "${PG_EFFECTIVE_CACHE_SIZE:=512MB}"
  : "${PG_CHECKPOINT_COMPLETION_TARGET:=0.9}"
  : "${PG_WAL_BUFFERS:=4MB}"
fi

export DATABASE_POOL_MAX
export DATABASE_POOL_CONNECTION_TIMEOUT_MS
export PG_MAX_CONNECTIONS
export PG_SHARED_BUFFERS
export PG_WORK_MEM
export PG_MAINTENANCE_WORK_MEM
export PG_EFFECTIVE_CACHE_SIZE
export PG_CHECKPOINT_COMPLETION_TARGET
export PG_WAL_BUFFERS

app_url="${APP_URL:-http://localhost:3000}"
api_url="${API_URL:-$app_url}"
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
  local postgres_container_id
  local api_container_id

  mkdir -p "$output_dir"
  postgres_container_id="$(docker compose ps -q postgres 2>/dev/null || true)"
  api_container_id="$(docker compose ps -q api 2>/dev/null || true)"

  if ! docker compose ps >"$output_dir/docker-compose-ps.txt" 2>&1; then
    printf 'command_failed\n' >>"$output_dir/docker-compose-ps.txt"
  fi

  if ! docker stats --no-stream >"$output_dir/docker-stats.txt" 2>&1; then
    printf 'command_failed\n' >>"$output_dir/docker-stats.txt"
  fi

  if [ -n "$api_container_id" ]; then
    if ! docker logs --since 10m "$api_container_id" >"$output_dir/api.log" 2>&1; then
      printf 'command_failed\n' >>"$output_dir/api.log"
    fi
  else
    printf 'container_not_found\n' >"$output_dir/api.log"
  fi

  if [ -n "$postgres_container_id" ]; then
    if ! docker logs --since 10m "$postgres_container_id" >"$output_dir/postgres.log" 2>&1; then
      printf 'command_failed\n' >>"$output_dir/postgres.log"
    fi
  else
    printf 'container_not_found\n' >"$output_dir/postgres.log"
  fi

  if ! docker compose exec -T postgres psql -U postgres -d traffic_data -c \
    "select now() as captured_at, state, count(*) as sessions from pg_stat_activity group by state order by state nulls last;" \
    >"$output_dir/postgres-activity.txt" 2>&1; then
    printf 'command_failed\n' >>"$output_dir/postgres-activity.txt"
  fi

  curl -fsS "$app_url/system/runtime" >"$output_dir/system-runtime.json" || printf 'command_failed\n' >"$output_dir/system-runtime.json"
  curl -fsS "$app_url/health/ready" >"$output_dir/health-ready.json" || printf 'command_failed\n' >"$output_dir/health-ready.json"
  curl -fsS "$api_url/api/dashboard/country-traffic" >"$output_dir/api-country-head.txt" || printf 'command_failed\n' >"$output_dir/api-country-head.txt"
  curl -fsS "$api_url/api/dashboard/vehicle-distribution" >"$output_dir/api-vehicle-head.txt" || printf 'command_failed\n' >"$output_dir/api-vehicle-head.txt"

  cat >"$output_dir/metadata.json" <<EOF
{
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "appUrl": "$app_url",
  "apiUrl": "$api_url",
  "phaseSet": "$phase_set",
  "profile": "$profile",
  "thinkTimeSeconds": "$think_time_seconds",
  "databasePoolMax": "$DATABASE_POOL_MAX",
  "databasePoolConnectionTimeoutMs": "$DATABASE_POOL_CONNECTION_TIMEOUT_MS",
  "pgMaxConnections": "$PG_MAX_CONNECTIONS",
  "pgSharedBuffers": "$PG_SHARED_BUFFERS",
  "pgWorkMem": "$PG_WORK_MEM",
  "pgMaintenanceWorkMem": "$PG_MAINTENANCE_WORK_MEM",
  "pgEffectiveCacheSize": "$PG_EFFECTIVE_CACHE_SIZE",
  "pgCheckpointCompletionTarget": "$PG_CHECKPOINT_COMPLETION_TARGET",
  "pgWalBuffers": "$PG_WAL_BUFFERS",
  "mode": "local"
}
EOF
}

phase_specs=()

record_phase() {
  local phase_name="$1"
  local target_rps="$2"
  local duration="$3"
  local max_p95="$4"
  phase_specs+=("${phase_name}|${target_rps}|${duration}|${max_p95}")
}

run_phase() {
  local scenario="$1"
  local phase_name="$2"
  local target_rps="$3"
  local duration="$4"
  local max_p95="$5"
  local phase_dir="$artifact_root/$phase_name"
  local summary_path="$phase_dir/summary.json"
  local summary_path_container="/results/$phase_name/summary.json"
  local base_time_period=300000
  local vu_time_period_stride=20000

  mkdir -p "$phase_dir/metrics"

  local script_path="/work/perf/k6-dashboard.js"
  local k6_api_url
  k6_api_url="$(containerize_url "$api_url")"
  local env_args=(
    -e TARGET_BASE_URL="$k6_api_url"
  )

  if [ "$scenario" = "write" ]; then
    case "$phase_name" in
      write-rps-5)
        base_time_period=100000000
        ;;
      write-rps-50)
        base_time_period=500000000
        ;;
      write-rps-500)
        base_time_period=900000000
        ;;
      write-rps-1000)
        base_time_period=1300000000
        ;;
      write-rps-2000)
        base_time_period=1700000000
        ;;
    esac

    script_path="/work/perf/k6-admin-writes.js"
    env_args=(
      -e API_BASE_URL="$k6_api_url"
      -e ADMIN_TOKEN="$admin_token"
      -e COUNTRY_ID="$country_id"
      -e VEHICLE_TYPE_ID="$vehicle_type_id"
      -e BASE_TIME_PERIOD="$base_time_period"
      -e VU_TIME_PERIOD_STRIDE="$vu_time_period_stride"
    )
  fi

  set +e
  docker run --rm \
    --add-host host.docker.internal:host-gateway \
    --user "$(id -u):$(id -g)" \
    -v "$repo_root:/work" \
    -v "$artifact_root:/results" \
    -w /work \
    grafana/k6 run \
    --summary-export "$summary_path_container" \
    "${env_args[@]}" \
    -e PHASE_NAME="$phase_name" \
    -e TARGET_RPS="$target_rps" \
    -e DURATION="$duration" \
    -e MAX_P95_MS="$max_p95" \
    -e MAX_FAILURE_RATE="0.01" \
    -e THINK_TIME_SECONDS="$think_time_seconds" \
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
docker compose up -d --build --force-recreate --remove-orphans postgres api
wait_for_url "$app_url/health/ready" "api health"
wait_for_url "$api_url/api/dashboard/country-traffic" "api read path"

npm --prefix backend run db:migrate
npm --prefix backend run seed:traffic-data

admin_token="$(
  curl -fsS \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" \
    "$admin_api_url/admin/login" |
    node --input-type=module -e "const payload = JSON.parse(await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); })); if (typeof payload.token !== 'string') throw new Error('No admin token returned'); console.log(payload.token);"
)"

country_id="$(
  curl -fsS \
    -H "Authorization: Bearer $admin_token" \
    "$api_url/api/admin/countries" |
    node --input-type=module -e "const payload = JSON.parse(await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); })); if (!Array.isArray(payload) || payload.length === 0) throw new Error('No country seed rows found'); console.log(payload[0].id);"
)"

vehicle_type_id="$(
  curl -fsS \
    -H "Authorization: Bearer $admin_token" \
    "$api_url/api/admin/vehicle-types" |
    node --input-type=module -e "const payload = JSON.parse(await new Promise((resolve) => { let data=''; process.stdin.on('data', (chunk) => data += chunk); process.stdin.on('end', () => resolve(data)); })); if (!Array.isArray(payload) || payload.length === 0) throw new Error('No vehicle type seed rows found'); console.log(payload[0].id);"
)"

if [ "$phase_set" = "all" ] || [ "$phase_set" = "reads" ]; then
  if [ "$profile" = "capacity" ]; then
    record_phase "read-rps-1000" 1000 "20s" 2500
    record_phase "read-rps-2000" 2000 "20s" 5000
    run_phase "read" "read-rps-1000" 1000 "20s" 2500
    run_phase "read" "read-rps-2000" 2000 "20s" 5000
  else
    record_phase "read-rps-5" 5 "20s" 800
    record_phase "read-rps-50" 50 "30s" 1200
    record_phase "read-rps-500" 500 "45s" 2500
    run_phase "read" "read-rps-5" 5 "20s" 800
    run_phase "read" "read-rps-50" 50 "30s" 1200
    run_phase "read" "read-rps-500" 500 "45s" 2500
  fi
fi

if [ "$phase_set" = "all" ] || [ "$phase_set" = "writes" ]; then
  if [ "$profile" = "capacity" ]; then
    record_phase "write-rps-1000" 1000 "20s" 2500
    record_phase "write-rps-2000" 2000 "20s" 5000
    run_phase "write" "write-rps-1000" 1000 "20s" 2500
    run_phase "write" "write-rps-2000" 2000 "20s" 5000
  else
    record_phase "write-rps-5" 5 "20s" 800
    record_phase "write-rps-50" 50 "30s" 1200
    record_phase "write-rps-500" 500 "45s" 2500
    run_phase "write" "write-rps-5" 5 "20s" 800
    run_phase "write" "write-rps-50" 50 "30s" 1200
    run_phase "write" "write-rps-500" 500 "45s" 2500
  fi
fi

manifest_path="$artifact_root/manifest.json"

cat >"$manifest_path" <<EOF
{
  "size": "local-docker-compose",
  "dropletId": "local",
  "dropletIp": "127.0.0.1",
  "appUrl": "$app_url",
  "apiUrl": "$api_url",
  "phases": [
EOF

phase_count=0
for phase_spec in "${phase_specs[@]}"; do
  IFS='|' read -r phase_name target_rps duration max_p95 <<<"$phase_spec"

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
