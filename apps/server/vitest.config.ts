import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // createTestApp pushes the Prisma schema to a temp SQLite db on first use.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
