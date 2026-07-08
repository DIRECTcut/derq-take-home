# Traffic Data Deployment Notes

## Runtime contract

The deployable unit from this repository is the Docker image built from `backend/Dockerfile`.

The runtime still depends on:

- PostgreSQL for the source-of-truth dataset
- Fastify for app delivery plus all public/admin HTTP routes

The external deployment repository can keep its existing Ansible ownership as long as it can:

1. pull `ghcr.io/<owner>/<repo>:<sha>`
2. inject the environment variables from `.env.example`
3. publish the Fastify app URL

## Environment contract

- `DATABASE_URL`: PostgreSQL connection string for Fastify migrations and startup
- `ADMIN_JWT_SECRET`: JWT secret used by Fastify to mint and verify admin sessions
- `DEPLOY_ADMIN_USERNAME`: admin login username injected into the API container
- `DEPLOY_ADMIN_PASSWORD`: admin login password injected into the API container
- `ADMIN_USERNAME`: admin login username used by the Fastify auth route
- `ADMIN_PASSWORD`: admin login password used by the Fastify auth route
- `DATABASE_POOL_MAX`: Fastify-side PostgreSQL pool size
- `DATABASE_POOL_CONNECTION_TIMEOUT_MS`: Fastify-side PostgreSQL pool acquisition timeout
- `FRONTEND_DIST_DIR`: path to the built frontend assets inside the runtime container

`VITE_API_BASE_URL` and `VITE_ADMIN_API_BASE_URL` remain local-Vite overrides only. The packaged runtime does not require build-time frontend URLs because Fastify serves the browser runtime config and the admin login posts back to the same origin.

## DigitalOcean performance path

Performance verification is part of the active delivery slice.

The repository now carries a repo-local `deploy/` toolkit plus a GitHub Actions performance workflow that:

1. builds one PR-scoped image from the candidate branch
2. provisions three representative single-node DigitalOcean droplets in parallel
3. deploys `api` and `postgres` on each droplet
4. runs sequential `5 RPS`, `50 RPS`, and `500 RPS` phases against the deployed Fastify read path
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
