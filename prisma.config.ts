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
    seed: 'tsx prisma/seed.ts',
  },
});
