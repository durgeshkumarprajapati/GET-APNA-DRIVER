import 'server-only';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '@prisma/client';
import { env } from '../config/env';

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Prisma 7 removed direct-connection support from PrismaClient's
 * constructor — a driver adapter is now required to connect straight to
 * Postgres (the alternative, `accelerateUrl`, is only for routing through
 * Prisma's hosted Accelerate proxy, which this project does not use).
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Accepted by repository functions so they can run either against the
 * top-level client or against an interactive-transaction client (`tx`),
 * letting application services compose multiple repository calls into one
 * atomic `prisma.$transaction(...)`.
 */
export type Db = PrismaClient | Prisma.TransactionClient;
