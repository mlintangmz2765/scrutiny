import bcrypt from 'bcryptjs';
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

app
  .listen({ port, host: '0.0.0.0' })
  .then(async () => {
    // T-01.1: warn on every start while the seeded default password still works.
    const admin = await app.prisma.user.findUnique({
      where: { email: 'admin@scrutiny.local' },
    });
    if (admin && (await bcrypt.compare('admin-change-me-now', admin.passwordHash))) {
      app.log.warn('SECURITY: the default admin password is still active — change it now.');
    }
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
