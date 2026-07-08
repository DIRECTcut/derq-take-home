# PostgREST Notes

The local PostgREST runtime is configured through [`infra/postgrest/postgrest.conf`](postgrest.conf).
The root [`docker-compose.yml`](../../docker-compose.yml) can override the main local performance knobs through `PGRST_*` environment variables, including `PGRST_DB_POOL` and `PGRST_DB_POOL_ACQUISITION_TIMEOUT`.

- Anonymous callers can read the chart-facing SQL views.
- Admin callers can write to the runtime tables when they present a JWT with the `traffic_admin` role claim.
- The Docker Compose service publishes PostgREST on `http://localhost:3001`.
