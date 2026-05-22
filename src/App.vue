<template>
  <div class="app" :class="epochClass">
    <!-- PWA 安装提示横幅 -->
    <div v-if="showInstallBanner" class="pwa-install-banner">
      <span class="pwa-install-banner__text">📱 安装到桌面，离线可玩</span>
      <button class="pwa-install-banner__btn" @click="installPWA">安装</button>
      <button class="pwa-install-banner__close" @click="showInstallBanner = false">✕</button>
    </div>

    <!-- 桌面：三栏 -->
    <main v-if="!isMobile" class="app-main">
      <LeftPanel />
      <CenterPanel />
      <RightPanel />
    </main>

    <!-- 移动端：纵向 + 标签切换 -->
    <main v-else class="app-main-mobile">
      <div class="mobile-center">
        <CenterPanel />
      </div>
      <div class="mobile-tabs">
        <button
          class="mobile-tab"
          :class="{ active: mobileTab === 'producers' }"
          @click="mobileTab = 'producers'"
        >生产</button>
        <button
          class="mobile-tab"
          :class="{ active: mobileTab === 'upgrades' }"
          @click="mobileTab = 'upgrades'"
        >升级</button>
        <button
          class="mobile-tab mobile-tab--tech"
          :class="{ active: mobileTab === 'tech' }"
          @click="mobileTab = 'tech'"
        >科技</button>
      </div>
      <div v-show="mobileTab === 'producers'" class="mobile-panel">
        <LeftPanel />
      </div>
      <div v-show="mobileTab === 'upgrades'" class="mobile-panel">
        <RightPanel />
      </div>
      <div v-show="mobileTab === 'tech'" class="mobile-panel mobile-panel--tech">
        <RightPanel />
      </div>
    </main>

    <!-- 底栏 -->
    <BottomBar @open-settings="showSettings = true" @open-help="showHelp = true" @open-stats="showStats = true" />

    <!-- 弹窗 -->
    <OfflineRewardModal />
    <NarrationToast />
    <HelpModal :visible="showHelp" @close="showHelp = false" />
    <StatsModal :visible="showStats" @close="showStats = false" />
    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useGameLoop } from '@/composables/useGameLoop';
import { useAutoSave } from '@/composables/useAutoSave';
import { useOffline } from '@/composables/useOffline';
import { EPOCH_CONFIGS } from '@/core/Constants';

import LeftPanel from '@/components/layout/LeftPanel.vue';
import CenterPanel from '@/components/layout/CenterPanel.vue';
import RightPanel from '@/components/layout/RightPanel.vue';
import BottomBar from '@/components/layout/BottomBar.vue';
import OfflineRewardModal from '@/components/modals/OfflineRewardModal.vue';
import NarrationToast from '@/components/feedback/NarrationToast.vue';
import HelpModal from '@/components/modals/HelpModal.vue';
import StatsModal from '@/components/modals/StatsModal.vue';
import SettingsModal from '@/components/modals/SettingsModal.vue';

const gameStore = useGameStore();
useOffline();
useGameLoop();
useAutoSave();

// 移动端检测
const isMobile = ref(window.innerWidth < 768);
function onResize() { isMobile.value = window.innerWidth < 768; }
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

// 移动端标签：生产者 / 升级 / 科技树
const mobileTab = ref<'producers' | 'upgrades' | 'tech'>('producers');

const epochClass = computed(() => {
  void gameStore.stateVersion;
  const epoch = EPOCH_CONFIGS.find((e) => e.id === gameStore.gameState.currentEpoch);
  return epoch?.visualClass ?? 'epoch-sprout';
});

const showSettings = ref(false);
const showHelp = ref(false);
const showStats = ref(false);

// PWA 安装提示
const showInstallBanner = ref(false);
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    showInstallBanner.value = true;
    console.log('[PWA] beforeinstallprompt 事件触发，可以安装');
  });
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] 已安装到桌面');
    showInstallBanner.value = false;
    deferredPrompt = null;
  });
});

async function installPWA() {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  console.log('[PWA] 安装结果:', result.outcome);
  deferredPrompt = null;
  showInstallBanner.value = false;
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh; height: 100dvh;
  width: 100vw;
  overflow: hidden;
  background-color: var(--color-bg);
}
.app.epoch-sprout { --epoch-glow: rgba(76, 175, 80, 0.03); }
.app.epoch-expand { --epoch-glow: rgba(0, 188, 212, 0.05); }
.app.epoch-construct { --epoch-glow: rgba(156, 39, 176, 0.04); }
.app.epoch-perceive { --epoch-glow: rgba(255, 215, 0, 0.04); }
.app.epoch-celestial { --epoch-glow: rgba(255, 255, 255, 0.05); }

.app-main {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* 移动端布局 */
.app-main-mobile {
  flex: 1;
  display: flex; flex-direction: column;
  min-height: 0;
}
.mobile-center {
  flex-shrink: 0;
}
.mobile-tabs {
  display: flex; border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
  padding: 0 4px;
}
.mobile-tab {
  flex: 1; padding: 10px 0; text-align: center;
  font-size: 13px; font-weight: 600; color: var(--color-text-dim);
  border-bottom: 2px solid transparent; transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  background: transparent; border-left: none; border-right: none; border-top: none;
}
.mobile-tab.active {
  color: var(--color-text); border-bottom-color: var(--color-growth);
}
.mobile-tab--tech.active { border-bottom-color: #00bcd4; }
.mobile-panel {
  flex: 1; min-height: 0; overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.mobile-panel--tech { padding-bottom: 8px; }

/* PWA 安装横幅 */
.pwa-install-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #1a237e, #0d47a1);
  color: #fff;
  font-size: 13px;
  flex-shrink: 0;
  z-index: 100;
}
.pwa-install-banner__text { flex: 1; }
.pwa-install-banner__btn {
  background: #4caf50;
  color: #fff; border: none;
  padding: 5px 16px; border-radius: 4px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.pwa-install-banner__close {
  background: none; border: none; color: rgba(255,255,255,0.7);
  font-size: 16px; cursor: pointer; padding: 4px;
  -webkit-tap-highlight-color: transparent;
}
</style>
