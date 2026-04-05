import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    // Default: Node environment for pure logic tests (ECS, config, game, systems)
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: [
      'tests/browser/**',
      // These import vitest/browser and need actual browser mode
      'tests/e2e/governor-playthrough.test.tsx',
      'tests/e2e/playthrough.test.tsx',
      'tests/e2e/long-playthrough.test.tsx',
    ],
    globals: true,
  },
});
