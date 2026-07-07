# Database Notes

`db/migrations/` contains the PostgreSQL schema, role, and read-model definitions for the Stage `0-2` backend slice.

- `001_initial_schema.sql` creates the runtime tables.
- `002_postgrest_roles.sql` creates the roles used by PostgREST.
- `003_read_models.sql` creates the chart-facing views and grants.

Apply the migrations with:

```bash
npm --prefix backend run db:migrate
```
