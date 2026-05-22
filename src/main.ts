import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles/global.css';
import './styles/animations.css';

// PWA: 确保 Service Worker 正确注册并缓存
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (worker) {
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              console.log('[PWA] Service Worker 已激活，离线功能就绪');
            }
          });
        }
      });
      console.log('[PWA] SW 注册成功:', registration.scope);
    } catch (err) {
      console.error('[PWA] SW 注册失败:', err);
    }
  });
}

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount('#app');
