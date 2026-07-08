# Database Notes

`db/migrations/` contains the PostgreSQL schema and read-model definitions for the runtime.

- `001_initial_schema.sql` creates the runtime tables.
- `002_postgrest_roles.sql` removes the legacy PostgREST roles from fresh or reset databases.
- `003_read_models.sql` creates the chart-facing views used by Fastify.

Apply the migrations with:

```bash
npm --prefix backend run db:migrate
```
