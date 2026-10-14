# One-command environment setup

Run a single script and the project is ready: Node dependencies installed,
PostgreSQL (PostGIS) + Redis running in Docker, `.env` generated with safe
local defaults, Prisma client generated, migrations applied, and demo data
seeded.

## Linux / macOS

```bash
bash scripts/setup.sh
```

The script does not need to be executable to run this way. If you'd rather
invoke it directly as `./scripts/setup.sh`, make it executable once:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

## Windows

Double-click `scripts\setup.cmd`, or from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
```

(`setup.cmd` is a thin wrapper around `setup.ps1` so you don't have to deal
with PowerShell's default execution-policy restrictions.)

## Flags

| Bash              | PowerShell   | What it does                                                                 |
| ----------------- | ------------ | ----------------------------------------------------------------------------- |
| `-y`, `--yes`     | `-Yes`       | Non-interactive — assume "yes" to every prompt (required installs proceed).  |
| `--skip-infra`    | `-SkipInfra` | Don't touch Docker/Postgres/Redis — use when `DATABASE_URL`/`REDIS_URL` already point at a managed/remote database. |
| `--skip-seed`     | `-SkipSeed`  | Run migrations but skip `prisma/seed.ts` — recommended for a real production database, since the seed creates demo admin/customer/driver accounts. |
| `-h`, `--help`    | n/a          | Show usage.                                                                  |

Examples:

```bash
bash scripts/setup.sh --yes --skip-seed
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -Yes -SkipSeed
```

## What the script does

1. **Checks/installs Node.js** (requires >= v22, matching CI) — via `nvm` on
   Linux/macOS or `winget` on Windows if missing or too old.
2. **Checks/installs Docker** (skipped with `--skip-infra`/`-SkipInfra`) —
   via the official install script on Linux, `brew` on macOS, or `winget`
   (Docker Desktop) on Windows.
3. **Creates `.env`** from `.env.example` if it doesn't exist yet. Every
   subsequent step only fills in values that are still missing or still the
   placeholder from `.env.example` — anything you've already customized is
   left untouched, so the script is safe to re-run.
   - Generates `POSTGRES_USER`/`POSTGRES_DB`/`POSTGRES_PORT`/`REDIS_PORT`
     defaults and a random `POSTGRES_PASSWORD` (these aren't in
     `.env.example` but are required by `docker-compose.yml`).
   - Points `DATABASE_URL`/`REDIS_URL` at the local Docker containers.
   - Generates a random `AUTH_SECRET`.
4. **Installs dependencies** (`npm ci`).
5. **Generates VAPID keys** for web push notifications (self-contained,
   no external account needed).
6. **Starts Postgres + Redis** via the project's `docker-compose.yml` and
   waits for both to report healthy (skipped with `--skip-infra`).
7. **Prisma**: `prisma generate` → `prisma migrate deploy` → seed (unless
   `--skip-seed`).

## Still needed after the script runs

These require your own external accounts/credentials and are deliberately
left as placeholders in `.env` for you to fill in:

- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` —
  [Razorpay Dashboard](https://dashboard.razorpay.com/).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — if
  using Google sign-in, from the Google Cloud Console.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` / `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` —
  Google Cloud Console.

**`NODE_ENV`**: `.env.example` defaults this to `production`. The real
Razorpay payment provider is selected whenever `NODE_ENV=production`,
*regardless of whether Razorpay credentials are actually configured* — so
for local development without real Razorpay keys, set `NODE_ENV=development`
in `.env` before starting the app, or payments will throw on first use.

## Running the project

```bash
npm run dev:all     # Linux/macOS: Next.js dev server + background worker together
npm run build && npm run start:all
```

On Windows (no single combined script), run these in two terminals:

```powershell
npm run dev
npm run worker
```

## Troubleshooting

- **Docker daemon not reachable**: make sure Docker Desktop (Windows/macOS)
  or the `docker` service (Linux) is actually running, then re-run the
  script.
- **Linux: "permission denied" on the Docker socket right after install**:
  the install script adds your user to the `docker` group, but that only
  takes effect in a new login session — log out and back in (or run
  `newgrp docker`), then re-run.
- **Postgres/Redis never become healthy**: check `docker compose logs
  postgres` / `docker compose logs redis` for the real error (e.g. a port
  already in use — change `POSTGRES_PORT`/`REDIS_PORT` in `.env`).
- **Using a managed/remote database instead of local Docker**: set
  `DATABASE_URL`/`REDIS_URL` in `.env` yourself first, then run the script
  with `--skip-infra`/`-SkipInfra`.
