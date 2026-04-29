# Postgres Cutover

Metro Memory is now wired for a shared Postgres database in production.

This matters for both:
- account auth flows such as sign up, login, email verification, and password reset
- automation review/apply flows in `/admin/automation`

## Why SQLite broke on Vercel
- The old local setup used `file:` SQLite.
- Vercel serverless functions cannot reliably share or persist a local SQLite file for auth writes.
- GitHub Actions cannot share that local file with Vercel either.
- The result was split state: local auth worked, production auth failed, and automation apply could not safely round-trip run status.

## Active migration chain
- The active Prisma datasource is now `postgresql`.
- The active migration history starts from:
  - `prisma/migrations/20260405180000_postgres_baseline`
- The old SQLite migration chain was moved to:
  - `prisma/sqlite-migrations-archive/`

This avoids trying to replay SQLite-specific SQL against Postgres.

## Required environment
Use the same shared Postgres `DATABASE_URL` in:
- local development when you want to test real auth/automation behavior
- Vercel
- GitHub Actions

Example:

```env
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/metro_memory?schema=public
```

## Cutover steps
1. Provision a managed Postgres database.
   Neon, Supabase, Railway, RDS, and similar providers all work.

2. Set `DATABASE_URL` in Vercel production.
   Use the Postgres connection string, not a `file:` path.

3. Set `DATABASE_URL` in GitHub repository secrets.
   The automation workflows and manual database-migrate workflow use this.

4. Apply the committed Prisma migrations.
   Use one of:

```bash
npm run db:migrate:deploy
```

or the manual GitHub Actions workflow:

- `.github/workflows/database-migrate.yml`

5. Redeploy Vercel after the database secret is set.

6. Verify production auth:
   - sign up
   - email verification
   - login
   - password reset

7. Verify production automation:
   - `/admin/automation` loads
   - review actions persist
   - apply workflow dispatches
   - apply status updates round-trip from GitHub Actions

## Migrating old local SQLite data
There are 2 realistic paths.

### Option A: start fresh on Postgres
Use this if the local SQLite data is disposable.

1. Provision Postgres.
2. Run `npm run db:migrate:deploy`.
3. Point Vercel and GitHub Actions at the new `DATABASE_URL`.

### Option B: keep old data
Use this if you care about local auth users or automation history stored in SQLite.

Recommended approach:
1. Keep the SQLite files as local archives.
2. Export the data you actually want to preserve.
3. Import it into Postgres with a one-off migration tool or script.

Because the old app used SQLite and the new app uses Postgres, there is no safe in-repo one-command automatic data migration here. Treat it as a deliberate one-time import job.

## Operational checks after cutover
- `DATABASE_URL` must not start with `file:`
- sign up on the live site should no longer fail at `check-existing-user`
- `/admin/automation` should no longer show the local-SQLite deployment warning
- Vercel-triggered apply jobs should move from `queued` to `running` to `completed`
- auth and automation state should now live in the same shared database

## Local development note
If your local `.env` still points at `file:./prisma/metro_memory.db`, update it before running Prisma against the new schema. The Prisma datasource is now Postgres-only.
