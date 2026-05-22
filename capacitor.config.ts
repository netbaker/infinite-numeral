import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.infinum.game',
  appName: '无限数域',
  webDir: 'dist',
  server: {
    // 内嵌模式：所有资源打包进 APK，不需要联网
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#0a0a1a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
    },
  },
};

export default config;
