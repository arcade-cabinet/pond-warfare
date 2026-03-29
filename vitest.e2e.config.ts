import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/e2e/**/*.test.{ts,tsx}'],
    testTimeout: 600_000, // 10 minute timeout for playthrough tests
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          launch: { headless: false },
        },
      ],
      screenshotDirectory: 'tests/e2e/screenshots',
    },
  },
});
