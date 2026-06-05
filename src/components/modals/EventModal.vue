<template>
  <Teleport to="body">
    <div v-if="visible && eventDef" class="event-overlay" @click.self="onTimeout">
      <div class="event-card">
        <!-- 事件图标 -->
        <div class="event-card__icon">{{ eventDef.icon }}</div>

        <!-- 事件名称 + 重大标记 -->
        <h2 class="event-card__title">
          {{ eventDef.name }}
          <span v-if="eventDef.isMajor" class="event-card__major-tag">重大</span>
        </h2>

        <!-- 事件描述 -->
        <p class="event-card__desc">{{ eventDef.description }}</p>

        <!-- 非重大事件倒计时 -->
        <div v-if="!eventDef.isMajor && countdown > 0" class="event-card__countdown">
          ⏱ 剩余 {{ Math.ceil(countdown) }} 秒自动选择
        </div>

        <!-- 分隔线 -->
        <div class="event-card__divider"></div>

        <!-- 选项列表 -->
        <div class="event-card__options">
          <button
            v-for="(option, index) in eventDef.options"
            :key="index"
            class="event-card__option"
            @click="onChoose(index)"
          >
            <span class="event-card__option-text">{{ option.text }}</span>
            <!-- 效果预览标签 -->
            <div class="event-card__option-effects">
              <span
                v-for="(effect, ei) in option.effects"
                :key="ei"
                class="event-card__effect-tag"
                :class="getEffectTagClass(effect)"
              >
                {{ formatEffectPreview(effect) }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { EventDef, EventEffect } from '@/types/game';

defineProps<{
  visible: boolean;
  eventDef: EventDef | null;
  /** 倒计时剩余秒数（非重大事件用） */
  countdown: number;
}>();

const emit = defineEmits<{
  choose: [optionIndex: number];
  timeout: [];
}>();

function onChoose(optionIndex: number): void {
  emit('choose', optionIndex);
}

function onTimeout(): void {
  // 点击遮罩 = 超时/取消（由父组件决定是否视为超时）
  emit('timeout');
}

/**
 * 格式化效果预览文本
 * 例如：global_multiplier +0.5 → "产出+50%"
 */
function formatEffectPreview(effect: EventEffect): string {
  const typeLabels: Record<string, string> = {
    global_multiplier: effect.value > 0 ? '产出' : '产出',
    producer_boost: '生产者',
    cost_change: effect.value > 0 ? '成本' : '成本',
    stardust_gain: '星尘',
    stardust_loss: '星尘',
    number_drain: '数字流失',
    speed_change: effect.value > 1 ? '加速' : '减速',
  };

  const label = typeLabels[effect.type] ?? effect.type;

  if (effect.type === 'stardust_gain') return `✦${effect.value}`;
  if (effect.type === 'stardust_loss') return `-✦${effect.value}`;
  if (effect.type === 'number_drain') return `-${Math.round(effect.value * 100)}%数字`;
  if (effect.type === 'speed_change') return `${effect.value >= 1 ? '×' : ''}${effect.value}速`;
  if (effect.type === 'global_multiplier' || effect.type === 'producer_boost') {
    const pct = Math.round(Math.abs(effect.value) * 100);
    return effect.value >= 0 ? `+${pct}%` : `-${pct}%`;
  }
  if (effect.type === 'cost_change') {
    const pct = Math.round(Math.abs(effect.value) * 100);
    return effect.value > 0 ? `+${pct}%` : `-${pct}%`;
  }

  return label;
}

/**
 * 根据效果类型返回 CSS 类名
 */
function getEffectTagClass(effect: EventEffect): string {
  const positiveTypes = ['global_multiplier', 'producer_boost', 'stardust_gain', 'speed_change'];
  const negativeTypes = ['stardust_loss', 'number_drain', 'cost_change'];

  if (negativeTypes.includes(effect.type)) return 'event-card__effect-tag--bad';
  if (positiveTypes.includes(effect.type) && effect.value < 0) return 'event-card__effect-tag--bad';
  if (positiveTypes.includes(effect.type)) return 'event-card__effect-tag--good';
  if (effect.type === 'cost_change' && effect.value < 0) return 'event-card__effect-tag--good';

  return '';
}
</script>

<style scoped>
.event-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.75);
  animation: eventFadeIn 0.2s ease;
  /* 阻止背景滚动 */
  overscroll-behavior: contain;
}

.event-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 400px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
  padding: var(--spacing-lg);
  background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
  border-radius: var(--border-radius);
  border: 1px solid rgba(255, 193, 7, 0.25);
  box-shadow:
    0 0 40px rgba(255, 193, 7, 0.08),
    0 8px 32px rgba(0, 0, 0, 0.5);
  animation: eventSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ---- 图标 ---- */
.event-card__icon {
  font-size: 42px;
  line-height: 1;
  filter: drop-shadow(0 0 12px rgba(255, 193, 7, 0.4));
  animation: iconPulse 2s ease-in-out infinite;
}

/* ---- 标题 ---- */
.event-card__title {
  font-size: 20px;
  font-weight: 700;
  color: #ffc107;
  letter-spacing: 3px;
  text-align: center;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-card__major-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: rgba(244, 67, 54, 0.2);
  color: #ff5252;
  letter-spacing: 1px;
  border: 1px solid rgba(244, 67, 54, 0.3);
}

/* ---- 描述 ---- */
.event-card__desc {
  font-size: 14px;
  color: var(--color-text);
  text-align: center;
  line-height: 1.7;
  margin: 0;
}

/* ---- 倒计时 ---- */
.event-card__countdown {
  font-size: 12px;
  color: #ff9800;
  text-align: center;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.2);
  animation: countdownPulse 1s ease-in-out infinite;
}

/* ---- 分隔线 ---- */
.event-card__divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 193, 7, 0.3),
    transparent
  );
}

/* ---- 选项列表 ---- */
.event-card__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  width: 100%;
}

/* ---- 单个选项按钮 ---- */
.event-card__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.event-card__option:hover {
  background-color: rgba(255, 193, 7, 0.08);
  border-color: rgba(255, 193, 7, 0.25);
  transform: translateX(4px);
}

.event-card__option:active {
  transform: scale(0.98) translateX(2px);
}

/* ---- 选项文字 ---- */
.event-card__option-text {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0e0;
}

/* ---- 效果标签行 ---- */
.event-card__option-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ---- 效果标签 ---- */
.event-card__effect-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  transition: opacity 0.15s ease;
}

.event-card__effect-tag--good {
  background-color: rgba(76, 175, 80, 0.15);
  color: #81c784;
  border: 1px solid rgba(76, 175, 80, 0.25);
}

.event-card__effect-tag--bad {
  background-color: rgba(244, 67, 54, 0.12);
  color: #e57373;
  border: 1px solid rgba(244, 67, 54, 0.2);
}

/* ---- 动画 ---- */
@keyframes eventFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes eventSlideUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes countdownPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---- 移动端适配 ---- */
@media (max-width: 480px) {
  .event-card {
    width: 94vw;
    padding: var(--spacing-md);
    gap: var(--spacing-sm);
    max-height: 80vh;
  }

  .event-card__icon {
    font-size: 36px;
  }

  .event-card__title {
    font-size: 18px;
    letter-spacing: 2px;
  }

  .event-card__desc {
    font-size: 13px;
  }

  .event-card__option {
    padding: 10px 12px;
  }

  .event-card__option-text {
    font-size: 13px;
  }
}
</style>
