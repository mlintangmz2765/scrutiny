import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'admin@scrutiny.local';
const ADMIN_DEFAULT_PASSWORD = 'admin-change-me-now';

const prisma = new PrismaClient();

async function main() {
  // Idempotent: running the seed twice never duplicates the admin (T-01.1).
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`Seed: admin ${ADMIN_EMAIL} already exists — skipping.`);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 12);
  await prisma.user.create({
    data: { email: ADMIN_EMAIL, name: 'Administrator', role: 'ADMIN', passwordHash },
  });
  console.log(`Seed: created admin ${ADMIN_EMAIL} with the default password.`);
  console.warn('Seed: WARNING — change the default admin password immediately.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
