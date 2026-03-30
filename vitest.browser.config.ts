import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
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
    include: ['tests/browser/**/*.test.{ts,tsx}'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{
        browser: 'chromium',
        launch: {
          args: ['--window-size=1280,720'],
        },
      }],
      viewport: { width: 1280, height: 720 },
      screenshotDirectory: 'tests/browser/screenshots',
    },
  },
});
