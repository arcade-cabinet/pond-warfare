import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

function manualChunks(id: string): string | undefined {
  if (id.includes('node_modules')) {
    if (id.includes('/preact/') || id.includes('/signal-polyfill/')) return 'vendor-ui';
    if (id.includes('/pixi.js/') || id.includes('/@pixi/')) return 'vendor-pixi';
    if (id.includes('/tone/')) return 'vendor-audio';
    if (id.includes('/bitecs/') || id.includes('/yuka/') || id.includes('/planck-js/')) {
      return 'vendor-sim';
    }
    if (
      id.includes('/@capacitor/') ||
      id.includes('/capacitor-') ||
      id.includes('/jeep-sqlite/') ||
      id.includes('/sql.js/')
    ) {
      return 'vendor-storage';
    }
    return 'vendor';
  }

  if (
    id.includes('/src/ui/screens/') ||
    id.includes('/src/ui/menu-screen') ||
    id.includes('/src/ui/comic-') ||
    id.includes('/src/ui/LoadingScreen') ||
    id.includes('/src/ui/SplashVideo')
  ) {
    return 'ui-screens';
  }

  if (
    id.includes('/src/ui/hud/') ||
    id.includes('/src/ui/components/') ||
    id.includes('/src/ui/overlays/') ||
    id.includes('/src/ui/command-panel') ||
    id.includes('/src/ui/radial-') ||
    id.includes('/src/ui/keyboard-reference') ||
    id.includes('/src/ui/error-overlay') ||
    id.includes('/src/ui/evacuation-overlay') ||
    id.includes('/src/ui/game-over') ||
    id.includes('/src/ui/game-actions') ||
    id.includes('/src/ui/game-events') ||
    id.includes('/src/ui/Tooltip')
  ) {
    return 'ui-shell';
  }

  if (id.includes('/src/config/')) {
    return 'game-config';
  }

  if (
    id.includes('/src/ecs/components') ||
    id.includes('/src/ecs/world') ||
    id.includes('/src/ecs/archetypes')
  ) {
    return 'ecs-core';
  }

  if (id.includes('/src/governor/')) {
    return 'governor';
  }

  if (id.includes('/src/ecs/systems/ai/')) {
    return 'enemy-ai';
  }

  if (
    id.includes('/src/game/') ||
    id.includes('/src/ecs/') ||
    id.includes('/src/rendering/') ||
    id.includes('/src/terrain/') ||
    id.includes('/src/physics/') ||
    id.includes('/src/audio/') ||
    id.includes('/src/ai/')
  ) {
    return 'game-runtime';
  }

  return undefined;
}

export default defineConfig({
  base: process.env.CAPACITOR === 'true' ? '/' : '/pond-warfare/',
  plugins: [preact(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      crypto: resolve(__dirname, 'src/platform/crypto-shim.ts'),
      'node:crypto': resolve(__dirname, 'src/platform/crypto-shim.ts'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
});
