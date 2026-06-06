<template>
  <Teleport to="body">
    <div v-if="isActive" class="tutorial-overlay" @click.self="handleOverlayClick">
      <!-- 步骤内容卡片 -->
      <div class="tutorial-card" :class="{ 'tutorial-card--top': position === 'top', 'tutorial-card--bottom': position === 'bottom' }">
        <div class="tutorial-progress">
          <div class="tutorial-progress__bar">
            <div class="tutorial-progress__fill" :style="{ width: progressPercent + '%' }" />
          </div>
          <span class="tutorial-progress__text">{{ currentStep + 1 }} / {{ totalSteps }}</span>
        </div>

        <div class="tutorial-icon">{{ step.icon }}</div>
        <h3 class="tutorial-title">{{ step.title }}</h3>
        <p class="tutorial-desc">{{ step.description }}</p>

        <div class="tutorial-actions">
          <button v-if="currentStep > 0" class="tutorial-btn tutorial-btn--secondary" @click="prevStep">
            上一步
          </button>
          <button class="tutorial-btn tutorial-btn--primary" @click="nextStep">
            {{ isLastStep ? '开始游戏' : '下一步' }}
          </button>
        </div>

        <button v-if="!isLastStep" class="tutorial-skip" @click="skipTutorial">
          跳过引导
        </button>
      </div>

      <!-- 高亮目标区域提示（可选） -->
      <div v-if="step.highlight" class="tutorial-highlight" :class="step.highlightClass">
        <div class="tutorial-highlight__pulse" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();

interface TutorialStep {
  title: string;
  description: string;
  icon: string;
  highlight?: boolean;
  highlightClass?: string;
  position?: 'top' | 'bottom' | 'center';
}

const steps: TutorialStep[] = [
  {
    title: '欢迎来到无限数域',
    description: '这是一个关于数字增长的放置游戏。你的目标很简单：让数字变得无限大。通过点击、购买生产者、升级和重置来突破层层极限。',
    icon: '✨',
    position: 'center',
  },
  {
    title: '脉冲 — 数字的起源',
    description: '点击中央的「脉冲」按钮来获取数字。这是你最基础的数字来源。快速点击可以获得更多！偶尔还会触发暴击，获得大量数字。',
    icon: '👆',
    highlight: true,
    highlightClass: 'highlight-pulse',
    position: 'bottom',
  },
  {
    title: '生产者 — 自动增长',
    description: '左侧是生产者面板。用数字购买生产者，它们会自动每秒产出数字。先买便宜的，逐步解锁更高级的生产者。记得升级它们！',
    icon: '🏭',
    highlight: true,
    highlightClass: 'highlight-left',
    position: 'top',
  },
  {
    title: '升级 — 强化效率',
    description: '右侧是升级面板。花费数字购买升级，可以大幅提升点击收益或生产者效率。合理分配资源，优先购买性价比高的升级。',
    icon: '⬆️',
    highlight: true,
    highlightClass: 'highlight-right',
    position: 'top',
  },
  {
    title: '坍缩 — 重置与飞跃',
    description: '当数字达到 100T (10^14) 时，你可以进行「坍缩」。这会重置数字和升级，但获得「星尘」——一种永久货币，用于购买强大的星尘升级。',
    icon: '✦',
    highlight: true,
    highlightClass: 'highlight-prestige',
    position: 'top',
  },
  {
    title: '更多层次',
    description: '星尘积累到一定程度可以「膨胀」获得暗能量，暗能量积累后可以「超越」获得奇点……每一层都会带来全新的能力和挑战。',
    icon: '🌌',
    position: 'center',
  },
  {
    title: '挑战与成就',
    description: '完成每日挑战、限时挑战和里程碑挑战可以获得额外奖励。解锁成就不仅带来成就感，部分成就还会提供永久加成。',
    icon: '🏆',
    position: 'center',
  },
  {
    title: '维度系统',
    description: '解锁多个维度，每个维度有独立的数字和生产体系。维度晶体是跨维度的通用货币。在不同维度间切换，寻找最优策略。',
    icon: '🌀',
    position: 'center',
  },
  {
    title: '准备好了吗？',
    description: '记住：自动存档每30秒进行一次。点击底栏的 ⚙ 可以手动保存/加载。祝你游戏愉快，让数字突破天际！',
    icon: '🚀',
    position: 'center',
  },
];

const totalSteps = steps.length;

const currentStep = computed(() => gameStore.gameState.tutorialStep);
const isActive = computed(() => currentStep.value >= 0 && currentStep.value < totalSteps);
const isLastStep = computed(() => currentStep.value === totalSteps - 1);
const step = computed(() => steps[currentStep.value] ?? steps[0]);
const progressPercent = computed(() => ((currentStep.value + 1) / totalSteps) * 100);
const position = computed(() => step.value.position ?? 'center');

function nextStep() {
  if (isLastStep.value) {
    completeTutorial();
  } else {
    gameStore.gameState.tutorialStep++;
    gameStore.stateVersion.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    gameStore.gameState.tutorialStep--;
    gameStore.stateVersion.value++;
  }
}

function skipTutorial() {
  completeTutorial();
}

function completeTutorial() {
  gameStore.gameState.tutorialStep = -1;
  gameStore.stateVersion.value++;
}

function handleOverlayClick() {
  // 点击遮罩不关闭，防止误触
}
</script>

<style scoped>
.tutorial-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
}

.tutorial-card {
  width: 380px;
  max-width: 90vw;
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--border-radius);
  text-align: center;
  animation: tutorialSlideIn 0.3s ease-out;
}

@keyframes tutorialSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tutorial-progress {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.tutorial-progress__bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.tutorial-progress__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-growth), var(--color-milestone));
  border-radius: 2px;
  transition: width 0.3s ease;
}

.tutorial-progress__text {
  font-size: 11px;
  color: var(--color-text-dim);
  font-weight: 500;
  white-space: nowrap;
}

.tutorial-icon {
  font-size: 48px;
  margin-bottom: var(--spacing-sm);
  line-height: 1;
}

.tutorial-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
}

.tutorial-desc {
  font-size: 13px;
  color: var(--color-text-dim);
  line-height: 1.7;
  margin-bottom: var(--spacing-md);
}

.tutorial-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
}

.tutorial-btn {
  padding: 10px 24px;
  border-radius: var(--border-radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.tutorial-btn--primary {
  background: linear-gradient(135deg, var(--color-growth), #2e7d32);
  color: #fff;
}

.tutorial-btn--primary:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
}

.tutorial-btn--secondary {
  background: var(--color-surface-hover);
  color: var(--color-text);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tutorial-btn--secondary:hover {
  background: rgba(255, 255, 255, 0.08);
}

.tutorial-skip {
  margin-top: var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-dim);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.tutorial-skip:hover {
  color: var(--color-text);
}

/* 高亮脉冲效果 */
.tutorial-highlight {
  position: fixed;
  pointer-events: none;
  z-index: 2001;
}

.tutorial-highlight__pulse {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--color-growth);
  animation: highlightPulse 1.5s ease-in-out infinite;
}

@keyframes highlightPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.3;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .tutorial-card {
    width: 92vw;
    padding: var(--spacing-md);
  }

  .tutorial-title {
    font-size: 16px;
  }

  .tutorial-desc {
    font-size: 12px;
  }

  .tutorial-icon {
    font-size: 40px;
  }
}
</style>
