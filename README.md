# Get Apna Driver

A marketplace platform connecting car owners with professional drivers. Single-repository,
full-stack Next.js application using a modular monolith architecture.

## Stack

- **Next.js** (App Router) + React + TypeScript (strict mode)
- **PostgreSQL + PostGIS** via Prisma (`pgcrypto`, `postgis`, `citext` extensions)
- **Redis** (ioredis) for cache, locks, rate limiting, queues, and transient data
- **Tailwind CSS v4** with centralized design tokens (`src/app/globals.css`)
- **pino** structured logging
- **Jest** for unit/integration tests

## Getting started

1. Copy the environment template and fill in real values:

   ```bash
   cp example.env .env
   ```

2. Start local PostgreSQL (PostGIS) and Redis:

   ```bash
   npm run db:up
   ```

3. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npm run prisma:generate
   ```

4. Apply database migrations (creates the required extensions; no domain tables yet):

   ```bash
   npm run prisma:migrate
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

6. Verify health:

   ```bash
   curl http://localhost:3000/api/health/live
   curl http://localhost:3000/api/health/ready
   ```

## Project layout

```text
src/
├── app/            # Routes (pages + API route handlers), UI composition only
├── modules/        # Domain modules (added incrementally, one per phase)
└── shared/         # Cross-cutting infrastructure: config, database, redis, logging, errors
prisma/             # Prisma schema and migrations
tests/
├── unit/
├── integration/
└── e2e/
```

Domain modules (`src/modules/*`) and worker code (`src/worker/`) are introduced as their
respective phases are implemented — see phase reports for what currently exists.

## Scripts

| Script                            | Purpose                                     |
| --------------------------------- | ------------------------------------------- |
| `npm run dev`                     | Start the Next.js dev server                |
| `npm run build`                   | Production build                            |
| `npm run start`                   | Run the production build                    |
| `npm run lint` / `lint:fix`       | ESLint                                      |
| `npm run format` / `format:check` | Prettier                                    |
| `npm run typecheck`               | `tsc --noEmit`                              |
| `npm run test` / `test:watch`     | Jest                                        |
| `npm run prisma:generate`         | Generate the Prisma client                  |
| `npm run prisma:migrate`          | Create/apply a dev migration                |
| `npm run db:up` / `db:down`       | Local PostgreSQL + Redis via Docker Compose |
