import { buildApp } from './app.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file — fine in production containers where env vars are set directly.
}

// Prisma resolves relative SQLite paths from apps/server/prisma/ (see docs/DECISIONS.md).
process.env.DATABASE_URL ??= 'file:../../../data/scrutiny.db';

const port = Number(process.env.PORT ?? 3001);
const app = buildApp({ logger: true });

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
