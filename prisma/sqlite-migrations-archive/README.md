# SQLite Migration Archive

These migrations were the old SQLite-era history for local development.

They are intentionally no longer in `prisma/migrations/` because the app now
uses Postgres in production and GitHub Actions runs `prisma migrate deploy`
against that shared Postgres database. Replaying SQLite SQL against Postgres is
not valid.

The active migration chain now starts from the Postgres baseline in:

- `prisma/migrations/20260405180000_postgres_baseline`

Keep this archive only as historical reference while moving any local SQLite
data you still care about into Postgres.
