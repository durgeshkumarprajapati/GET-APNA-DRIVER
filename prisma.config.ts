// Prisma 7's config-file CLI does not auto-load `.env` the way the old
// schema-based CLI did (Next.js loads `.env` for its own process, which is
// why `npm run dev`/`build` never needed this) — `npx prisma ...` runs
// outside Next entirely, so without this, `process.env.DATABASE_URL` below
// is undefined and every Prisma CLI command fails with "datasource.url is
// required".
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    // `--conditions=react-server` makes every `import 'server-only'` guard
    // in the shared/application modules resolve to that package's no-op
    // export instead of throwing — the same export condition Next.js's own
    // server bundler activates, which is why this never surfaces from
    // `next dev`/`build`. A bare `tsx` process run outside Next (this seed
    // script, and `npm run worker`) doesn't set it by default.
    seed: 'NODE_OPTIONS=--conditions=react-server tsx prisma/seed.ts',
  },
});
