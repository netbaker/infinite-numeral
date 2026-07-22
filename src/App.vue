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
        <!-- 移动状态条：仅绑定既有 store 取值，不新增状态/逻辑 -->
        <div class="mobile-status">
          <div class="mobile-status__row">
            <span class="mobile-status__label">每秒产出</span>
            <span class="mobile-status__value mobile-status__value--cps">+{{ gameStore.displayOutputPerSec }}/秒</span>
          </div>
          <div class="mobile-status__row">
            <span class="mobile-status__label">总计</span>
            <span class="mobile-status__value mobile-status__value--total">{{ gameStore.displayTotalNumber }}</span>
          </div>
          <ProgressBar
            class="mobile-status__progress"
            :percent="nextEpochPercent"
            :color="'var(--color-milestone)'"
          />
        </div>
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
        <RightPanel mode="upgrades" />
      </div>
      <div v-show="mobileTab === 'tech'" class="mobile-panel mobile-panel--tech">
        <RightPanel mode="tech" />
      </div>
    </main>

    <!-- 持续效果指示器（在底栏上方） -->
    <EffectIndicator
      v-if="gameStore.activeEffects.length > 0"
      :effects="gameStore.activeEffects"
    />

    <!-- 任务徽章（悬浮按钮） -->
    <TaskBadge
      :unclaimed-count="unclaimedCount"
      @open="showChallenge = true"
    />

    <!-- 底栏 -->
    <BottomBar
      @open-settings="showSettings = true"
      @open-help="showHelp = true"
      @open-stats="showStats = true"
      @open-achievements="showAchievements = true"
      @open-challenge="showChallenge = true"
      @open-dimension="showDimension = true"
      @open-gene="showGene = true"
      @open-archive="showArchive = true"
      @open-codex="showCodex = true"
      @open-skin="showSkin = true"
      @use-stabilizer="gameStore.useEntropyStabilizer()"
      @use-rewind="gameStore.useEntropyRewind()"
      @use-barrier="gameStore.useEntropyBarrier()"
    />

    <!-- 弹窗 -->
    <OfflineRewardModal />
    <NarrationToast />
    <AchievementToast />
    <HelpModal :visible="showHelp" @close="showHelp = false" />
    <StatsModal :visible="showStats" @close="showStats = false" />
    <AchievementsModal :visible="showAchievements" @close="showAchievements = false" />
    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
      @restart-tutorial="restartTutorial"
    />

    <!-- 新手指引 -->
    <TutorialGuide />

    <!-- 事件弹窗 -->
    <EventModal
      :visible="!!gameStore.activeEventDef"
      :event-def="gameStore.activeEventDef?.def ?? null"
      :countdown="gameStore.eventCountdown"
      @choose="gameStore.makeEventChoice"
      @timeout="gameStore.dismissEvent"
    />

    <!-- 挑战任务面板 -->
    <ChallengePanel
      :visible="showChallenge"
      :daily-challenges="challengeData.daily"
      :timed-challenges="challengeData.timed"
      :milestone-challenges="challengeData.milestone"
      :daily-stats="dailyStats"
      :unclaimed-count="unclaimedCount"
      @close="showChallenge = false"
      @claim="(id) => gameStore.claimChallengeReward(id)"
      @start-timed="(id) => gameStore.startTimedChallenge(id)"
    />

    <!-- 维度面板 -->
    <DimensionPanel
      :visible="showDimension"
      @close="showDimension = false"
      @switch="(id) => gameStore.switchDimension(id)"
      @unlock="(id) => gameStore.unlockDimension(id)"
      @synthesize="gameStore.synthesizeCrystal()"
      @buy-crystal="(id) => gameStore.buyCrystalUpgrade(id)"
    />

    <!-- 基因链面板 -->
    <GeneChain
      :visible="showGene"
      @close="showGene = false"
    />

    <!-- 宇宙档案馆 -->
    <ArchiveModal
      :visible="showArchive"
      @close="showArchive = false"
    />

    <!-- Sprint 3：数字神话图鉴 -->
    <CodexModal
      :visible="showCodex"
      @close="showCodex = false"
    />

    <!-- Sprint 3：图鉴收录通知（右上角堆叠） -->
    <CodexToast />

    <!-- Sprint 4：皮肤定制 -->
    <SkinSelector :visible="showSkin" @close="showSkin = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useGameLoop } from '@/composables/useGameLoop';
import { useAutoSave } from '@/composables/useAutoSave';
import { useOffline } from '@/composables/useOffline';
import { EPOCH_CONFIGS } from '@/core/Constants';

import LeftPanel from '@/components/layout/LeftPanel.vue';
import CenterPanel from '@/components/layout/CenterPanel.vue';
import RightPanel from '@/components/layout/RightPanel.vue';
import BottomBar from '@/components/layout/BottomBar.vue';
import ProgressBar from '@/components/progress/ProgressBar.vue';
import CodexModal from '@/components/modals/CodexModal.vue';
import CodexToast from '@/components/feedback/CodexToast.vue';
import SkinSelector from '@/components/modals/SkinSelector.vue';
import OfflineRewardModal from '@/components/modals/OfflineRewardModal.vue';
import NarrationToast from '@/components/feedback/NarrationToast.vue';
import AchievementToast from '@/components/feedback/AchievementToast.vue';
import AchievementsModal from '@/components/modals/AchievementsModal.vue';
import HelpModal from '@/components/modals/HelpModal.vue';
import StatsModal from '@/components/modals/StatsModal.vue';
import SettingsModal from '@/components/modals/SettingsModal.vue';
import EventModal from '@/components/modals/EventModal.vue';
import EffectIndicator from '@/components/game/EffectIndicator.vue';
import ChallengePanel from '@/components/modals/ChallengePanel.vue';
import TaskBadge from '@/components/game/TaskBadge.vue';
import DimensionPanel from '@/components/game/DimensionPanel.vue';
import GeneChain from '@/components/game/GeneChain.vue';
import TutorialGuide from '@/components/game/TutorialGuide.vue';
import ArchiveModal from '@/components/modals/ArchiveModal.vue';

const gameStore = useGameStore();
useOffline();
useGameLoop();
useAutoSave();

// Sprint 4：监听当前 UI 主题，写入 <html data-theme="..."> 触发 CSS 变量级联
watch(
  () => gameStore.activeTheme,
  (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
  },
  { immediate: true },
);

// 移动端检测
const isMobile = ref(window.innerWidth < 768);
function onResize() { isMobile.value = window.innerWidth < 768; }
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));

// 移动端标签：生产者 / 升级 / 科技树
const mobileTab = ref<'producers' | 'upgrades' | 'tech'>('producers');

// 移动端状态条：下一纪元进度（复用 gameStore 既有方法，纯展示，不新增状态/逻辑）
const nextEpochPercent = computed(() => gameStore.epochProgress().percent);

const epochClass = computed(() => {
  void gameStore.stateVersion;
  const epoch = EPOCH_CONFIGS.find((e) => e.id === gameStore.gameState.currentEpoch);
  return epoch?.visualClass ?? 'epoch-sprout';
});

const showSettings = ref(false);
const showHelp = ref(false);
const showStats = ref(false);
const showAchievements = ref(false);
const showChallenge = ref(false);
const showDimension = ref(false);
const showGene = ref(false);
const showArchive = ref(false);
const showCodex = ref(false);
const showSkin = ref(false);

// 挑战面板数据
const challengeData = computed(() => {
  void gameStore.stateVersion; // 强制追踪 stateVersion 变化
  const data = gameStore.getChallengePanelData();
  return {
    daily: data.filter(c => c.def.category === 'daily').map(c => ({
      def: c.def, state: c.state, progressPercent: c.progressPercent,
    })),
    timed: data.filter(c => c.def.category === 'timed').map(c => ({
      def: c.def, state: c.state, progressPercent: c.progressPercent,
      isActive: c.isActive, isExpired: c.isExpired, canStart: c.canStart,
      remainingFormat: c.remainingFormatted,
    })),
    milestone: data.filter(c => c.def.category === 'milestone').map(c => ({
      def: c.def, state: c.state, progressPercent: c.progressPercent,
    })),
  };
});
const dailyStats = computed(() => gameStore.challengeSystem.getDailyStats(gameStore.gameState));
const unclaimedCount = computed(() => gameStore.getChallengeUnclaimedCount());

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

function restartTutorial() {
  gameStore.gameState.tutorialStep = 0;
  gameStore.stateVersion++;
  showSettings.value = false;
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
.app.epoch-expand { --epoch-glow: rgba(var(--color-tech-accent-rgb), 0.05); }
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
.mobile-tab--tech.active { border-bottom-color: var(--color-tech-accent); }
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

/* ============================================================
 * 移动端布局重平衡（Sprint UI 优化）
 * 子组件视觉微调统一用 :deep() + 移动媒体查询，子组件源码零改动。
 * 仅用 --spacing-* / --color-* / --border-radius 变量，严禁硬编码 hex。
 * ============================================================ */
@media (max-width: 767px) {
  /* 上半：自适应 + 上限封顶，内部铺满，消除空旷 */
  .mobile-center {
    flex: 0 0 auto;
    max-height: 46dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--color-border);
  }

  /* CenterPanel 移动端内部用 order 重排并铺满（:deep 覆盖子组件 scoped） */
  .app-main-mobile :deep(.center-panel) {
    flex: 1 1 auto;
    justify-content: space-between;
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }
  .app-main-mobile :deep(.epoch-indicator) { order: 1; }
  .app-main-mobile :deep(.number-display) { order: 2; }
  .app-main-mobile :deep(.center-panel__click-area) { order: 3; }
  /* prestige 无子时高度0、不占空白；显式 order:4 使其保持在脉冲下方（补文档遗漏） */
  .app-main-mobile :deep(.center-panel__prestige) { order: 4; }

  /* 脉冲按钮略缩，减少四周留白（不改渐变/动画） */
  .app-main-mobile :deep(.pulse-button) {
    width: min(104px, 28vw);
    height: min(104px, 28vw);
  }

  /* 新增状态条（数据来自既有 store 取值，纯展示） */
  .mobile-status {
    order: 4;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    border-radius: var(--border-radius);
  }
  .mobile-status__row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .mobile-status__label { font-size: 12px; color: var(--color-text-dim); }
  .mobile-status__value { font-size: 13px; font-weight: 600; color: var(--color-text); }
  .mobile-status__value--cps { color: var(--color-growth); }
  .mobile-status__value--total { color: var(--color-number); }
  .mobile-status__progress { width: 100%; }

  /* 标签栏定高、≥44px 触控 */
  .mobile-tabs { min-height: 44px; }
  .mobile-tab {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* 下半占余量（维持 flex:1; min-height:0; overflow-y:auto） */
  .mobile-panel { padding: var(--spacing-md); }

  /* 面板在移动端必须全宽（替代 RightPanel/LeftPanel 各自移动端 width 规则；删 RightPanel.vue 内部 @media 后此条为唯一来源） */
  .app-main-mobile :deep(.left-panel),
  .app-main-mobile :deep(.right-panel) {
    max-width: 100%; min-width: 0; width: 100%;
  }

  /* 卡片网格：移动端默认 2 列（覆盖 360–414px 主流手机）；≤340px 超窄回退单列 */
  .app-main-mobile :deep(.left-panel__list),
  .app-main-mobile :deep(.right-panel__list) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-md);
  }
  @media (max-width: 340px) {
    .app-main-mobile :deep(.left-panel__list),
    .app-main-mobile :deep(.right-panel__list) { grid-template-columns: 1fr; }
  }
  /* compact 列表（因子/暗能量/元）与科技树保持单列（图结构/窄卡不宜 2 列） */
  .app-main-mobile :deep(.right-panel__list--compact) { grid-template-columns: 1fr; gap: var(--spacing-sm); }
  .app-main-mobile :deep(.right-panel__section--tech) { grid-template-columns: 1fr; }

  /* 吸顶分组标题 */
  .app-main-mobile :deep(.right-panel__section-title) {
    position: sticky;
    top: 0;
    background: var(--color-surface);
    z-index: 2;
  }

  /* ---- ProducerCard：密度 + 触控（内部 @media 已删，此处为唯一来源） ---- */
  .app-main-mobile :deep(.producer-card) { padding: var(--spacing-sm); gap: var(--spacing-sm); }
  .app-main-mobile :deep(.producer-card__name) { font-size: 13px; }
  .app-main-mobile :deep(.producer-card__body) { font-size: 12px; gap: var(--spacing-sm); flex-wrap: wrap; }
  .app-main-mobile :deep(.producer-card__buy-btn) {
    min-height: 44px; font-size: 13px; border-radius: var(--border-radius);
  }
  .app-main-mobile :deep(.producer-card__bulk-btn) {
    min-height: 44px; min-width: 44px; font-size: 12px; padding: 0 6px;
  }
  .app-main-mobile :deep(.producer-card__output-label),
  .app-main-mobile :deep(.producer-card__cost-label) { display: inline; font-size: 12px; }

  /* ---- UpgradeCard：密度 + 触控 ≥44px（分类着色不动） ---- */
  .app-main-mobile :deep(.upgrade-card) { padding: var(--spacing-sm) var(--spacing-md); gap: var(--spacing-sm); }
  .app-main-mobile :deep(.upgrade-card__description) { line-height: 1.5; font-size: 12px; }
  .app-main-mobile :deep(.upgrade-card__buy-btn) { min-height: 44px; font-size: 13px; }
  /* 紧凑升级（暗能量/元）"买"按钮触控达标（原无 min-height → ~20px） */
  .app-main-mobile :deep(.upgrade-mini__btn) { min-height: 44px; font-size: 12px; }

  /* ---- FactorCard：保持单列；分类着色/左 border 不动 ---- */
  .app-main-mobile :deep(.factor-card) { padding: var(--spacing-sm); gap: var(--spacing-sm); }
  .app-main-mobile :deep(.factor-card__desc) { font-size: 12px; line-height: 1.4; }
  .app-main-mobile :deep(.factor-card__effect-value) { font-size: 12px; }
  .app-main-mobile :deep(.factor-card__level) { font-size: 12px; }

  /* 状态条间隙抬到 --spacing-sm（原 --spacing-xs=4px） */
  .mobile-status { gap: var(--spacing-sm); }

  /* ---- 底部栏收敛：单行横向滚动，避免换行吃空间 ---- */
  .app :deep(.bottom-bar) {
    height: auto;
    min-height: 44px;
    max-height: 56px;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: var(--spacing-sm);
  }
  .app :deep(.bottom-bar__settings-btn) {
    min-height: 44px; min-width: 44px;
    font-size: 18px;
  }
  .app :deep(.bottom-bar__item) { white-space: nowrap; }
  /* 熵值消耗按钮（稳定/回溯/屏障）触控 ≥44px，且不被 56px 底栏裁掉 */
  .app :deep(.entropy-bar__action) {
    min-height: 44px; min-width: 44px;
  }
}
</style>
