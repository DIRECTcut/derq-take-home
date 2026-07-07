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

## Packaged runtime

`backend/Dockerfile` builds both workspaces and produces a single runtime container that:

- serves the built Vue app from Fastify
- connects to PostgreSQL through `DATABASE_URL`
- expects a browser-reachable PostgREST base URL through `POSTGREST_BASE_URL` for backend runtime metadata
- serves runtime browser config from `/app-config.js`, sourced from `POSTGREST_BASE_URL`

For local Docker Compose usage, the backend serves the frontend on `http://localhost:3000` and PostgREST remains public on `http://localhost:3001`.

## Verification

- Frontend build: `npm --prefix frontend run build`
- Frontend tests: `npm --prefix frontend run test`
- Backend feature tests: `DATABASE_URL=postgres://postgres:postgres@localhost:55432/traffic_data POSTGREST_BASE_URL=http://localhost:3001 npm --prefix backend run test:feature`
- Packaged runtime: `docker compose up -d --build api postgrest postgres`

## CI/CD

- Pull requests run build and test only through `.github/workflows/ci.yml`.
- Pushes to `main` build and publish `ghcr.io/<owner>/<repo>:<sha>` through `.github/workflows/build.yml`.
- No workflow emits a `latest` tag.

## Deployment handoff

The external VPS/Ansible repo only needs:

- the published image reference `ghcr.io/<owner>/<repo>:<sha>`
- runtime environment values from `.env.example`
- a public URL for PostgREST that the browser can reach

See [`docs/solutions/traffic-data-deployment-notes.md`](docs/solutions/traffic-data-deployment-notes.md) for the deferred performance path and VPS expectations.
