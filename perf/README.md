## Local performance checks

- `perf/run-local.sh` runs local Docker Compose benchmarks against the Fastify read path that CI exercises, plus the authenticated Fastify admin write path.
- The script starts the local stack, applies migrations, reseeds the dataset, runs `k6` phases, and writes artifacts under `perf-local/<timestamp>/`.
- Usage:
  - `bash perf/run-local.sh reads standard`
  - `bash perf/run-local.sh writes standard`
  - `bash perf/run-local.sh all capacity`
  - `bash perf/run-local.sh writes capacity /tmp/perf-writes-capacity`
- Profiles:
  - `standard`: includes light think time and the original 5/50/500 RPS ballpark phases.
  - `capacity`: removes think time, applies larger Fastify DB-pool/PostgreSQL settings by default, and runs the 1000/2000 RPS capacity phases.
- Useful tuning env vars:
  - `DATABASE_POOL_MAX`
  - `DATABASE_POOL_CONNECTION_TIMEOUT_MS`
  - `PG_MAX_CONNECTIONS`
  - `PG_SHARED_BUFFERS`
  - `PG_WORK_MEM`
  - `PG_MAINTENANCE_WORK_MEM`
  - `PG_EFFECTIVE_CACHE_SIZE`
- Artifacts now include:
  - per-phase `summary.json`
  - parsed `result.json`
  - `docker stats`, `pg_stat_activity`, Fastify API logs, and PostgreSQL logs
  - status-class counters for `409`, `504`, other `5xx`, dropped iterations, and successful responses
- Local runs provide ballpark numbers for this machine and Docker setup.
  They are useful for comparing changes, but they are not directly comparable to the DigitalOcean CI matrix.
