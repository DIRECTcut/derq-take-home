# Traffic Data Deployment Notes

## Runtime contract

The deployable unit from this repository is the Docker image built from `backend/Dockerfile`.

The runtime still depends on:

- PostgreSQL for the source-of-truth dataset
- PostgREST for read models and admin-only write exposure
- a public browser path to PostgREST because the Vue frontend reads PostgREST directly

The external deployment repository can keep its existing Ansible ownership as long as it can:

1. pull `ghcr.io/<owner>/<repo>:<sha>`
2. inject the environment variables from `.env.example`
3. publish both the Fastify app URL and the PostgREST URL

## Environment contract

- `DATABASE_URL`: PostgreSQL connection string for Fastify migrations and startup
- `FRONTEND_DIST_DIR`: path to the built frontend assets inside the runtime container
- `POSTGREST_BASE_URL`: PostgREST base URL that the backend exposes through `/system/runtime` and `/app-config.js`
- `POSTGREST_JWT_SECRET`: shared JWT secret for admin-only PostgREST writes
- `POSTGREST_ANON_ROLE`: PostgREST anonymous read role
- `POSTGREST_ADMIN_ROLE`: PostgREST admin write role

`VITE_POSTGREST_BASE_URL` remains optional for local Vite development. The packaged runtime does not require a build-time frontend URL because Fastify serves browser config at request time.

## Deferred performance path

There is no current performance gate on this delivery slice. Performance work is deferred, not omitted.

The intended follow-up sequence is:

1. `5 RPS`: validate the deployed VPS path, baseline latency, and PostgREST/browser connectivity under light concurrent traffic.
2. `50 RPS`: identify backend, database, or network bottlenecks and apply focused query, indexing, or container tuning.
3. `500 RPS`: decide whether the existing single-node shape still holds or whether higher-order changes are needed.

Each checkpoint should run against the remote VPS deployment rather than a developer laptop so the measurements reflect the real deployment path.
