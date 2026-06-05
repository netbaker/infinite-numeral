<template>
  <Transition name="effect-slide">
    <div v-if="effects.length > 0" class="effect-bar">
      <!-- 标题 -->
      <div class="effect-bar__label">⚡ 活跃效果</div>

      <!-- 效果列表（横向滚动） -->
      <div class="effect-bar__list" ref="scrollContainer">
        <div
          v-for="effect in effects"
          :key="effect.id"
          class="effect-bar__item"
          :class="getItemClass(effect)"
          :title="getEffectTooltip(effect)"
        >
          <!-- 图标 + 名称 -->
          <span class="effect-bar__item-icon">{{ effect.icon }}</span>
          <span class="effect-bar__item-name">{{ effect.name }}</span>

          <!-- 剩余时间 -->
          <span v-if="effect.remainingSeconds > 0" class="effect-bar__item-timer">
            {{ formatTime(effect.remainingSeconds) }}
          </span>
          <span v-else class="effect-bar__item-timer effect-bar__item-timer--permanent">∞</span>

          <!-- 效果摘要 -->
          <span class="effect-bar__item-summary">{{ effect.summary }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
export interface EffectData {
  id: string;
  sourceEventId: string;
  icon: string;
  name: string;
  summary: string;
  remainingSeconds: number;
  effects: Array<{ type: string; value: number; duration: number; target?: string }>;
}

defineProps<{
  effects: EffectData[];
}>();

/**
 * 判断效果条目类型 → 用于颜色编码
 * 规则：
 * - 包含 speed_change 且 value > 1 → 加速（蓝色）
 * - 包含 speed_change 且 value < 1 → 减速（橙色）
 * - 包含 global_multiplier/producer_boost 且全正 → 增益（绿色）
 * - 包含 stardust_loss / number_drain / 负倍率 → 减益（红色）
 */
function getItemClass(effect: EffectData): string {
  const hasNegativeInstant = effect.effects.some(
    (e) => e.type === 'stardust_loss' || e.type === 'number_drain'
  );
  const hasNegativeMultiplier = effect.effects.some(
    (e) =>
      (e.type === 'global_multiplier' || e.type === 'producer_boost') &&
      e.value < 0
  );
  const hasSpeedUp = effect.effects.some(
    (e) => e.type === 'speed_change' && e.value > 1
  );
  const hasSpeedDown = effect.effects.some(
    (e) => e.type === 'speed_change' && e.value < 1 && e.value > 0
  );

  if (hasSpeedUp) return 'effect-bar__item--speed-up';
  if (hasSpeedDown) return 'effect-bar__item--speed-down';
  if (hasNegativeInstant || hasNegativeMultiplier) return 'effect-bar__item--debuff';
  return 'effect-bar__item--buff';
}

/**
 * 生成 tooltip 文本（hover 显示详细效果）
 */
function getEffectTooltip(effect: EffectData): string {
  const lines: string[] = [`${effect.name} — ${effect.summary}`];
  for (const e of effect.effects) {
    if (e.duration > 0) {
      lines.push(`  ${e.type}: ${e.value} (${e.duration}s)`);
    }
  }
  return lines.join('\n');
}

/**
 * 格式化剩余时间
 * ≥60s 显示 "XmYs"，否则 "Xs"
 */
function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m${s}s`;
  }
  return `${Math.ceil(seconds)}s`;
}
</script>

<style scoped>
.effect-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: 6px 12px;
  background-color: rgba(20, 20, 40, 0.92);
  border-top: 1px solid rgba(255, 193, 7, 0.15);
  border-bottom: 1px solid rgba(255, 193, 7, 0.08);
  overflow: hidden;
  /* 底部固定在 BottomBar 上方 */
  position: relative;
  z-index: 10;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.effect-bar__label {
  font-size: 11px;
  font-weight: 700;
  color: #ffc107;
  letter-spacing: 1px;
  white-space: nowrap;
  flex-shrink: 0;
}

.effect-bar__list {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  /* 隐藏滚动条但保持可滚动 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 2px;
}

.effect-bar__list::-webkit-scrollbar {
  display: none;
}

/* ---- 单个效果条目 ---- */
.effect-bar__item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: transform 0.15s ease, opacity 0.15s ease;
  max-width: 200px;
}

.effect-bar__item:hover {
  transform: scale(1.04);
}

/* 颜色变体：增益（绿） */
.effect-bar__item--buff {
  background-color: rgba(76, 175, 80, 0.12);
  color: #a5d6a7;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

/* 颜色变体：减益（红） */
.effect-bar__item--debuff {
  background-color: rgba(244, 67, 54, 0.1);
  color: #ef9a9a;
  border: 1px solid rgba(244, 67, 54, 0.18);
}

/* 颜色变体：加速（蓝） */
.effect-bar__item--speed-up {
  background-color: rgba(33, 150, 243, 0.12);
  color: #90caf9;
  border: 1px solid rgba(33, 150, 243, 0.2);
}

/* 颜色变体：减速（橙） */
.effect-bar__item--speed-down {
  background-color: rgba(255, 152, 0, 0.12);
  color: #ffcc80;
  border: 1px solid rgba(255, 152, 0, 0.2);
}

/* ---- 条目内部元素 ---- */
.effect-bar__item-icon {
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.effect-bar__item-name {
  font-weight: 600;
  font-size: 11px;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

.effect-bar__item-timer {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.75;
  flex-shrink: 0;
}

.effect-bar__item-timer--permanent {
  opacity: 0.5;
}

.effect-bar__item-summary {
  font-size: 10px;
  opacity: 0.65;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

/* ---- 过渡动画 ---- */
.effect-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.effect-slide-leave-active {
  transition: all 0.2s ease-in;
}

.effect-slide-enter-from,
.effect-slide-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* ---- 移动端适配 ---- */
@media (max-width: 767px) {
  .effect-bar {
    padding: 5px 8px;
    gap: 4px;
  }

  .effect-bar__label {
    font-size: 10px;
  }

  .effect-bar__item {
    padding: 2px 6px;
    gap: 2px;
    max-width: 160px;
  }

  .effect-bar__item-name {
    font-size: 10px;
    max-width: 44px;
  }

  .effect-bar__item-summary {
    display: none; /* 手机上太挤了，隐藏摘要 */
  }

  .effect-bar__item-timer {
    font-size: 9px;
  }
}
</style>
