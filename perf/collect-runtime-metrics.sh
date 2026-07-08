#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <ssh-target> <output-dir> <app-url> <api-url>" >&2
  exit 1
fi

ssh_target="$1"
output_dir="$2"
app_url="${3%/}"
api_url="${4%/}"

remote_project_dir="${REMOTE_PROJECT_DIR:-/root/traffic-data-web-app}"
deploy_postgres_user="${DEPLOY_POSTGRES_USER:-postgres}"
deploy_postgres_db="${DEPLOY_POSTGRES_DB:-traffic_data}"
ssh_key_path="${SSH_PRIVATE_KEY_PATH:-}"

mkdir -p "$output_dir"

ssh_cmd=(ssh -o StrictHostKeyChecking=no)
if [ -n "$ssh_key_path" ]; then
  ssh_cmd+=(-i "$ssh_key_path")
fi

run_remote() {
  "${ssh_cmd[@]}" "$ssh_target" "$@"
}

capture_remote() {
  local output_file="$1"
  shift

  if ! run_remote "$@" >"$output_file" 2>&1; then
    printf 'command_failed\n' >>"$output_file"
  fi
}

capture_remote "$output_dir/docker-compose-ps.txt" "cd '$remote_project_dir' && docker compose ps"
capture_remote "$output_dir/docker-stats.txt" "docker stats --no-stream"
capture_remote "$output_dir/api.log" "cd '$remote_project_dir' && docker compose logs --since 10m api"
capture_remote "$output_dir/postgres.log" "cd '$remote_project_dir' && docker compose logs --since 10m postgres"
capture_remote "$output_dir/postgres-activity.txt" "cd '$remote_project_dir' && docker compose exec -T postgres psql -U '$deploy_postgres_user' -d '$deploy_postgres_db' -c \"select now() as captured_at, state, count(*) as sessions from pg_stat_activity group by state order by state nulls last;\""
capture_remote "$output_dir/system-runtime.json" "curl -fsS '$app_url/system/runtime'"
capture_remote "$output_dir/health-ready.json" "curl -fsS '$app_url/health/ready'"
capture_remote "$output_dir/api-country-head.txt" "curl -fsS '$api_url/api/dashboard/country-traffic' | head -c 512"
capture_remote "$output_dir/api-vehicle-head.txt" "curl -fsS '$api_url/api/dashboard/vehicle-distribution' | head -c 512"

cat >"$output_dir/metadata.json" <<EOF
{
  "capturedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "sshTarget": "$ssh_target",
  "appUrl": "$app_url",
  "apiUrl": "$api_url"
}
EOF
