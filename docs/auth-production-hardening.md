# Auth Production Hardening

This checklist is the production follow-up for Metro Memory auth and the shared Neon/Postgres database.

## Required Environment
- `DATABASE_URL` must point to the shared Postgres database used by both Vercel and GitHub Actions.
- `APP_BASE_URL` must be the public site URL, not `localhost`.
- `NEXT_PUBLIC_BASE_URL` should match `APP_BASE_URL`.
- `BREVO_HOST`, `BREVO_USER`, `BREVO_PASS`, and `MAIL_FROM_EMAIL` must be present before email-based auth flows are considered healthy.

Run this validation command anywhere you expect auth to work:

```bash
npm run check:auth-env
```

The command checks:
- auth email/base URL configuration
- database URL shape
- live database connectivity

## Post-Deploy Smoke Checklist
Run this after migrations and deploys:

1. Sign up for a new account.
2. Open the verification email and confirm it lands on the public host.
3. Log in with the verified account.
4. Open `/admin/automation/login` and confirm the page loads.
5. If admin credentials are configured, confirm the normal account session can reach `/admin/automation`.
6. Trigger the manual GitHub Actions auth smoke workflow if you want a repeatable browser check:
   - `.github/workflows/auth-smoke.yml`

## Local End-to-End Auth Testing
For local signup/verification testing without SMTP delivery, set:

```bash
AUTH_EMAIL_CAPTURE_DIR=/tmp/metro-memory-auth-emails
```

Then run:

```bash
npm run test:e2e
```

The local Playwright flow will:
- create an account
- read the captured verification email from disk
- open the verification link
- log in with the newly verified account

## Secrets
Rotate these immediately if they are ever exposed:
- database password / `DATABASE_URL`
- `BREVO_PASS`
- `AUTH_SECRET`

Keep the same production `DATABASE_URL` in:
- Vercel
- GitHub Actions

That is what keeps auth, automation review, and apply state consistent across environments.
