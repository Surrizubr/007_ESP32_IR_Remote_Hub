import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esp32.irremotehub',
  appName: 'ESP32 IR Remote',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true, // Vital: allows HTTP traffic to local ESP32 IP addresses (e.g., http://192.168.1.105)
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#020617',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617',
    },
  },
};

export default config;
