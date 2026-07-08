# Traffic Data Web App

Traffic data application with a Fastify backend, PostgreSQL persistence, Fastify-owned public/admin APIs, and a thin Vue frontend.

## Stack

- Backend: Node.js 24, TypeScript, Fastify 5.10.0
- Frontend: Vue 3.5.39, Vite, TypeScript
- Database: PostgreSQL 16
- Data exposure: Fastify routes backed by PostgreSQL tables and views
- Deployment shape: Docker and Docker Compose

## Local development

1. Copy `.env.example` values into your shell or local env file.
2. Install backend dependencies with `npm ci` in `backend/`.
3. Install frontend dependencies with `npm ci` in `frontend/`.
4. Start PostgreSQL with `docker compose up -d postgres`.
5. Run backend migrations and seeding from `backend/`:
   - `npm run db:migrate`
   - `npm run seed:traffic-data`
6. Start the frontend from `frontend/` with `npm run dev`.
7. Start the backend from `backend/` with `npm run dev`.

The frontend reads Fastify-owned API endpoints.
Local Vite development can still override the public API origin with `VITE_API_BASE_URL`, which defaults to `http://localhost:3000`.
For the admin login flow during local Vite development, set `VITE_ADMIN_API_BASE_URL` to the Fastify origin, which defaults to `http://localhost:3000`.

### Admin UI

- Open `#/admin/login` from the navbar or directly in the browser.
- Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- After login, the admin screen creates `traffic_metrics` rows through Fastify admin routes using a short-lived JWT minted and verified by Fastify.
- Slice 1 only covers metric creation. Editing and deleting existing entries are still deferred.

## Packaged runtime

`backend/Dockerfile` builds both workspaces and produces a single runtime container that:

- serves the built Vue app from Fastify
- connects to PostgreSQL through `DATABASE_URL`
- serves runtime browser config from `/app-config.js` for same-origin API usage
- verifies admin credentials from `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- uses `ADMIN_JWT_SECRET` for admin session tokens
- uses `DATABASE_POOL_MAX` and `DATABASE_POOL_CONNECTION_TIMEOUT_MS` for Fastify-side PostgreSQL pooling

For local Docker Compose usage, the backend serves the frontend and API on `http://localhost:3000`.

## Verification

- Frontend build: `npm --prefix frontend run build`
- Frontend tests: `npm --prefix frontend run test`
- Backend feature tests: `DATABASE_URL=postgres://postgres:postgres@localhost:55432/traffic_data ADMIN_USERNAME=admin ADMIN_PASSWORD=local-admin-password ADMIN_JWT_SECRET=super-secret-admin-key-for-local-dev-32 npm --prefix backend run test:feature`
- Packaged runtime: `docker compose up -d --build api postgres`
- Deploy scaffold validity: `docker compose -f deploy/docker-compose.yml config` and `ansible-playbook -i deploy/inventory.yml deploy/prod.yml --syntax-check`
- Perf helper tests: `node --test perf/*.test.mjs`

## CI/CD

- Pull requests run build and test through `.github/workflows/ci.yml`.
- Trusted pull requests in the main repository also run `.github/workflows/performance.yml`, which:
  - builds one PR-scoped image
  - deploys it to three single-node DigitalOcean droplet sizes in parallel
  - benchmarks the deployed Fastify read path at 5, 50, and 500 RPS
  - uploads raw artifacts plus an aggregate summary
  - updates a PR comment with the comparison report
- Pushes to `main` build and publish `ghcr.io/<owner>/<repo>:<sha>` through `.github/workflows/build.yml`.
- No workflow emits a `latest` tag.

Fork pull requests do not run the secret-backed performance deployment path.
The workflow emits a safe skip state instead of trying to deploy with missing credentials.

## Performance workflow setup

Configure these GitHub Actions secrets before expecting the performance workflow to pass:

- `DIGITAL_OCEAN_TOKEN`: used to create and destroy review droplets
- `GH_PAT`: used by the remote droplet to authenticate to GHCR and pull the PR-scoped image

Representative VPS sizes:

- `s-1vcpu-1gb`
- `s-1vcpu-2gb`
- `s-2vcpu-4gb`

Each matrix leg publishes:

- raw k6 summary output per phase
- host and PostgreSQL snapshots captured after each phase
- a leg-level `result.json`
- teardown evidence

The aggregate job fails when a size artifact is missing or teardown evidence is incomplete, even if one or more benchmark phases produced latency data.

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

### Latest pinned snapshot

These numbers are pinned to commit `3db8511` (`Improve local performance harness and tuning`) and were measured locally on `2026-07-08` before the Fastify-only cutover.

- Reads, tuned capacity profile: about `901 RPS` at `read-rps-1000` (`p95 11.52ms`) and about `1374 RPS` at `read-rps-2000` (`p95 2266.71ms`), with `0` failures.
- Writes, baseline capacity profile: about `467 RPS` at `write-rps-1000` and about `411 RPS` at `write-rps-2000`, with `504` pool timeouts and heavy dropped iterations.
- Writes, tuned capacity profile: about `992 RPS` at `write-rps-1000` and about `1748-1999 RPS` at `write-rps-2000`, with `0` failures.
- Main takeaway: the default PostgREST pool of `10` connections was the dominant local write bottleneck; raising the pool and local PostgreSQL limits removed the observed `504` saturation failures.

### Current local ballpark

Measured on `2026-07-08` after the Fastify-only cutover using `/tmp/perf-fastify-after` and the same `capacity` profile shape:

- Tuned Fastify read capacity profile (`DATABASE_POOL_MAX=50`, `DATABASE_POOL_CONNECTION_TIMEOUT_MS=30000`, larger local PostgreSQL settings):
  - `read-rps-1000`: achieved about `996.55 RPS`, `p95 21.17ms`, `0` failures, `64` dropped iterations
  - `read-rps-2000`: achieved about `1296.59 RPS`, `p95 2088.85ms`, `0` failures, `5705` dropped iterations
- Tuned Fastify write capacity profile (`DATABASE_POOL_MAX=50`, `DATABASE_POOL_CONNECTION_TIMEOUT_MS=30000`, larger local PostgreSQL settings):
  - `write-rps-1000`: achieved about `906.93 RPS`, `p95 132.83ms`, `0` failures, `12` dropped iterations
  - `write-rps-2000`: achieved about `1066.79 RPS`, `p95 660.53ms`, `0` failures, `3572` dropped iterations

### Fastify cutover comparison

Compared to the pinned `2026-07-08` PostgREST-backed baseline:

- `read-rps-1000`: throughput improved from about `901 RPS` to about `996.55 RPS`, while `p95` latency rose from `11.52ms` to `21.17ms`
- `read-rps-2000`: throughput fell from about `1374 RPS` to about `1296.59 RPS`, while `p95` latency improved from `2266.71ms` to `2088.85ms`
- `write-rps-1000`: throughput fell from about `992 RPS` to about `906.93 RPS`, and `p95` latency rose from `42.34ms` to `132.83ms`
- `write-rps-2000`: throughput fell from the prior tuned `1748-1999 RPS` range to about `1066.79 RPS`, but the run still completed with `0` failures and without the old `504` pool-saturation signature

The cutover preserved correctness and removed the external PostgREST service, but it regressed the high-end write envelope and slightly softened the `2000 RPS` read ceiling.
If higher local throughput matters, the next tuning work should focus on the Fastify-side DB pool and the Node request path rather than on the removed PostgREST gateway.

## Deployment handoff

Repo-local VPS deployment lives in [`deploy/`](deploy/README.md).
It reuses the referenced SSH-plus-Ansible deployment pattern but points it at this repo's immutable image runtime.

See [`docs/solutions/traffic-data-deployment-notes.md`](docs/solutions/traffic-data-deployment-notes.md) for the DigitalOcean testbed contract and benchmark expectations.
