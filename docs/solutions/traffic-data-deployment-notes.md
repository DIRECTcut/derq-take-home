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
- `ADMIN_USERNAME`: admin login username used by the Fastify auth route
- `ADMIN_PASSWORD`: admin login password used by the Fastify auth route
- `FRONTEND_DIST_DIR`: path to the built frontend assets inside the runtime container
- `POSTGREST_BASE_URL`: PostgREST base URL that the backend exposes through `/system/runtime` and `/app-config.js`
- `POSTGREST_JWT_SECRET`: shared JWT secret for admin-only PostgREST writes
- `POSTGREST_ANON_ROLE`: PostgREST anonymous read role
- `POSTGREST_ADMIN_ROLE`: PostgREST admin write role

`VITE_POSTGREST_BASE_URL` and `VITE_ADMIN_API_BASE_URL` remain local-Vite overrides only. The packaged runtime does not require build-time frontend URLs because Fastify serves the browser runtime config and the admin login posts back to the same origin.

## DigitalOcean performance path

Performance verification is part of the active delivery slice.

The repository now carries a repo-local `deploy/` toolkit plus a GitHub Actions performance workflow that:

1. builds one PR-scoped image from the candidate branch
2. provisions three representative single-node DigitalOcean droplets in parallel
3. deploys `api`, `postgrest`, and `postgres` on each droplet
4. runs sequential `5 RPS`, `50 RPS`, and `500 RPS` phases against the deployed read path
5. captures host, health, and PostgreSQL snapshots after each phase
6. aggregates the results into a workflow summary, uploaded artifacts, and a PR-visible report

The representative size matrix is:

- `s-1vcpu-1gb`
- `s-1vcpu-2gb`
- `s-2vcpu-4gb`

This slice remains intentionally single-node.
It explains single-node hardware scaling dynamics rather than horizontal scaling behavior.

## Verification contract

The performance workflow is expected to prove all of these:

- same-repo pull requests can provision and tear down the review testbed with `DIGITAL_OCEAN_TOKEN`
- the remote host can pull the candidate image from GHCR with `GH_PAT`
- every VPS-size leg uploads raw benchmark artifacts and teardown evidence
- the aggregate job fails when an expected size artifact or teardown record is missing

Fork pull requests do not receive the necessary deploy secrets, so the workflow must report a safe skip state instead of attempting the deploy path.
