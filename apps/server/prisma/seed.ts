import { PrismaClient } from '@prisma/client';
import { FSLI_GROUPS } from '@scrutiny/shared';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = 'admin@scrutiny.local';
const ADMIN_DEFAULT_PASSWORD = 'admin-change-me-now';

const prisma = new PrismaClient();

/** Idempotent: upsert by code so re-running never duplicates or drifts (T-02.1). */
async function seedFsliGroups() {
  for (const [index, group] of FSLI_GROUPS.entries()) {
    const data = {
      name: group.name,
      statement: group.statement,
      normalSign: group.normalSign,
      sortOrder: index,
    };
    await prisma.fsliGroup.upsert({
      where: { code: group.code },
      update: data,
      create: { code: group.code, ...data },
    });
  }
  console.log(`Seed: upserted ${FSLI_GROUPS.length} FSLI groups.`);
}

async function seedAdmin() {
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

async function main() {
  await seedFsliGroups();
  await seedAdmin();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
