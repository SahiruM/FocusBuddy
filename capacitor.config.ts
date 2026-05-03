import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.studybud',
  appName: 'StudyBud',
  webDir: 'dist',           // your React build output
  server: {
    androidScheme: 'https'
  }
};

export default config;