import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.pondwarfare',
  appName: 'Pond Warfare',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
