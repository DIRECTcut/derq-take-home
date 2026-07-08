# Traffic Data Web App

Traffic data application with a Fastify backend, PostgreSQL persistence, PostgREST read and admin-write exposure, and a thin Vue frontend.

## Stack

- Backend: Node.js 24, TypeScript, Fastify 5.10.0
- Frontend: Vue 3.5.39, Vite, TypeScript
- Database: PostgreSQL 16
- Data exposure: PostgREST 14.14
- Deployment shape: Docker and Docker Compose

## Local development

1. Copy `.env.example` values into your shell or local env file.
2. Install backend dependencies with `npm ci` in `backend/`.
3. Install frontend dependencies with `npm ci` in `frontend/`.
4. Start PostgreSQL and PostgREST with `docker compose up -d postgres postgrest`.
5. Run backend migrations and seeding from `backend/`:
   - `npm run db:migrate`
   - `npm run seed:traffic-data`
6. Start the frontend from `frontend/` with `npm run dev`.
7. Start the backend from `backend/` with `npm run dev`.

The frontend reads PostgREST directly through a runtime config script served by Fastify. Local Vite development can still override that with `VITE_POSTGREST_BASE_URL`, which defaults to `http://localhost:3001`.
For the admin login flow during local Vite development, set `VITE_ADMIN_API_BASE_URL` to the Fastify origin, which defaults to `http://localhost:3000`.

### Admin UI

- Open `#/admin/login` from the navbar or directly in the browser.
- Sign in with `ADMIN_USERNAME` and `ADMIN_PASSWORD`.
- After login, the admin screen creates `traffic_metrics` rows through PostgREST using a short-lived JWT minted by Fastify.
- Slice 1 only covers metric creation. Editing and deleting existing entries are still deferred.

## Packaged runtime

`backend/Dockerfile` builds both workspaces and produces a single runtime container that:

- serves the built Vue app from Fastify
- connects to PostgreSQL through `DATABASE_URL`
- expects a browser-reachable PostgREST base URL through `POSTGREST_BASE_URL` for backend runtime metadata
- serves runtime browser config from `/app-config.js`, sourced from `POSTGREST_BASE_URL`
- verifies admin credentials from `ADMIN_USERNAME` and `ADMIN_PASSWORD`

For local Docker Compose usage, the backend serves the frontend on `http://localhost:3000` and PostgREST remains public on `http://localhost:3001`.

## Verification

- Frontend build: `npm --prefix frontend run build`
- Frontend tests: `npm --prefix frontend run test`
- Backend feature tests: `DATABASE_URL=postgres://postgres:postgres@localhost:55432/traffic_data ADMIN_USERNAME=admin ADMIN_PASSWORD=local-admin-password POSTGREST_BASE_URL=http://localhost:3001 npm --prefix backend run test:feature`
- Packaged runtime: `docker compose up -d --build api postgrest postgres`
- Deploy scaffold validity: `docker compose -f deploy/docker-compose.yml config` and `ansible-playbook -i deploy/inventory.yml deploy/prod.yml --syntax-check`
- Perf helper tests: `node --test perf/*.test.mjs`

## CI/CD

- Pull requests run build and test through `.github/workflows/ci.yml`.
- Trusted pull requests in the main repository also run `.github/workflows/performance.yml`, which:
  - builds one PR-scoped image
  - deploys it to three single-node DigitalOcean droplet sizes in parallel
  - benchmarks the deployed PostgREST-backed read path at 5, 50, and 500 RPS
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

- `perf/run-local.sh` runs local Docker Compose benchmarks against the same PostgREST read path that CI exercises, plus an admin-authenticated PostgREST write path.
- The script starts the local stack, applies migrations, reseeds the dataset, runs `k6` phases, and writes artifacts under `perf-local/<timestamp>/`.
- Usage:
  - `bash perf/run-local.sh reads`
  - `bash perf/run-local.sh writes`
  - `bash perf/run-local.sh all`
- Local runs provide ballpark numbers for this machine and Docker setup.
  They are useful for comparing changes, but they are not directly comparable to the DigitalOcean CI matrix.

## Deployment handoff

Repo-local VPS deployment lives in [`deploy/`](deploy/README.md).
It reuses the referenced SSH-plus-Ansible deployment pattern but points it at this repo's immutable image runtime.

See [`docs/solutions/traffic-data-deployment-notes.md`](docs/solutions/traffic-data-deployment-notes.md) for the DigitalOcean testbed contract and benchmark expectations.
