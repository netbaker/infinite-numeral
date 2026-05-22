import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      // 关键：让 SW 在 dev 模式也能调试（生产构建自动启用）
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: '无限数域',
        short_name: '无限数域',
        description: '一款关于数字增长的增量游戏',
        theme_color: '#0a0a1a',
        background_color: '#0a0a1a',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 缓存所有静态资源
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 离线时回退到 index.html（SPA 必须）
        navigateFallback: 'index.html',
        // 关键：确保导航请求也走缓存
        navigateFallbackAllowlist: [/^$/],
        // 使用 CacheFirst 策略让离线更可靠
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  // PWA 需要绝对路径 '/'，部署到子目录时才需要改
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
  },
}));
