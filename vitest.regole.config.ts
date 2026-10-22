import { defineConfig } from 'vitest/config';

// Test delle regole di sicurezza: richiedono l'emulatore del database (npm run test:regole).
export default defineConfig({
  test: {
    include: ['tests-regole/**/*.test.ts'],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
