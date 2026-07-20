<template>
  <div class="entropy-bar" :class="[levelClass, { 'entropy-bar--barrier': barrierActive }]">
    <!-- 图标 + 标签 -->
    <span class="entropy-bar__icon">🌡️</span>
    <span class="entropy-bar__label">熵</span>

    <!-- 进度条容器 -->
    <div
      class="entropy-bar__track"
      :title="tooltipText"
      @click="emit('open-details')"
    >
      <div
        class="entropy-bar__fill"
        :style="{ width: displayPercent + '%' }"
      />
      <!-- 刻度线：50% / 80% / 100% -->
      <span class="entropy-bar__mark mark-50" v-if="displayPercent >= 40">50%</span>
      <span class="entropy-bar__mark mark-80" v-if="displayPercent >= 70">80%</span>

      <!-- 百分比文字（居中显示在进度条上） -->
      <span class="entropy-bar__text">{{ displayPercent }}%</span>
    </div>

    <!-- 状态标签 -->
    <span class="entropy-bar__status" :class="'status--' + level">
      {{ statusText }}
    </span>

    <!-- 道具快捷按钮（仅熵值 > 0 时显示） -->
    <button
      v-if="stabilizers > 0 && displayPercent > 15"
      class="entropy-bar__action btn-stabilizer"
      title="使用熵稳定剂 (-20)"
      @click.stop="emit('use-stabilizer')"
    >
      🧊{{ stabilizers }}
    </button>
    <button
      v-if="rewinds > 0 && displayPercent > 25"
      class="entropy-bar__action btn-rewind"
      title="使用时间回溯"
      @click.stop="emit('use-rewind')"
    >
      ⏪{{ rewinds }}
    </button>
    <button
      v-if="barriers > 0 && displayPercent > 15"
      class="entropy-bar__action btn-barrier"
      :title="barrierActive ? `维度屏障激活中（剩余 ${barrierRemaining}s）` : '使用维度屏障（60秒内熵值不上升）'"
      @click.stop="emit('use-barrier')"
    >
      🛡️{{ barriers }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  /** 当前熵值 (0-100) */
  entropy: number;
  /** 稳定剂持有数 */
  stabilizers: number;
  /** 回溯持有数 */
  rewinds: number;
  /** 维度屏障持有数 */
  barriers: number;
  /** 维度屏障激活截止时间戳(ms)，0=未激活 */
  barrierActiveUntil: number;
}>();

const emit = defineEmits<{
  'open-details': [];
  'use-stabilizer': [];
  'use-rewind': [];
  'use-barrier': [];
}>();

/** 维度屏障是否激活中 */
const barrierActive = computed(() => (props.barrierActiveUntil ?? 0) > Date.now());

/** 维度屏障剩余秒数 */
const barrierRemaining = computed(() => {
  const until = props.barrierActiveUntil ?? 0;
  if (until <= Date.now()) return 0;
  return Math.ceil((until - Date.now()) / 1000);
});

/** 显示用百分比（取整 0-100） */
const displayPercent = computed(() =>
  Math.max(0, Math.min(100, Math.round(props.entropy)))
);

/** 崩溃等级 */
const level = computed<'stable' | 'unstable' | 'critical' | 'collapsed'>(() => {
  const e = displayPercent.value;
  if (e >= 100) return 'collapsed';
  if (e >= 80) return 'critical';
  if (e >= 50) return 'unstable';
  return 'stable';
});

/** CSS 类名 */
const levelClass = computed(() => `entropy-level--${level.value}`);

/** 状态文字 */
const statusText = computed(() => {
  switch (level.value) {
    case 'collapsed': return '崩塌!';
    case 'critical': return '临界⚠';
    case 'unstable': return '不稳定';
    default: return '';
  }
});

/** Tooltip 文字 */
const tooltipText = computed(() => {
  const e = displayPercent.value;
  let text = `熵值 ${e}%`;
  if (e >= 80) text += ' — 产出 -50%，随机停机风险！建议尽快 Prestige 重置。';
  else if (e >= 50) text += ' — 产出已受影响(-20%)。';
  else text += ' — 宇宙处于稳定状态。';
  return text;
});
</script>

<style scoped>
.entropy-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.08);
  transition: background-color 0.3s ease;
}

/* 等级背景色 */
.entropy-level--stable {
  /* 无特殊背景，默认透明黑 */
}
.entropy-level--unstable {
  background: rgba(245, 158, 11, 0.12);
}
.entropy-level--critical {
  background: rgba(239, 68, 68, 0.15);
  animation: critical-pulse 1.5s ease-in-out infinite;
}
.entropy-level--collapsed {
  background: rgba(220, 38, 38, 0.25);
  animation: collapse-flash 0.5s ease-in-out 3;
}

/* 维度屏障激活：蓝色护盾边框 */
.entropy-bar--barrier .entropy-bar__track {
  border: 2px solid #3b82f6;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}

@keyframes critical-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes collapse-flash {
  0%, 100% { box-shadow: inset 0 0 10px rgba(220, 38, 38, 0.4); }
  50% { box-shadow: inset 0 0 20px rgba(220, 38, 38, 0.7); }
}

/* ---- 标签区 ---- */
.entropy-bar__icon {
  font-size: 14px;
  line-height: 1;
}
.entropy-bar__label {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.5px;
}

/* ---- 进度条轨道 ---- */
.entropy-bar__track {
  position: relative;
  flex: 1;
  min-width: 60px;
  max-width: 120px;
  height: 14px;
  border-radius: 7px;
  background: #e5e7eb;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s;
}
.entropy-bar__track:hover {
  transform: scaleY(1.3);
}

/* ---- 渐变填充条 ---- */
.entropy-bar__fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  border-radius: 7px;
  transition: width 0.3s ease, background 0.5s ease;
  /* 默认蓝色（稳定） */
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
}
.entropy-level--unstable .entropy-bar__fill {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}
.entropy-level--critical .entropy-bar__fill {
  background: linear-gradient(90deg, #ef4444, #f87171);
}
.entropy-level--collapsed .entropy-bar__fill {
  background: linear-gradient(90deg, #dc2626, #991b1b);
}

/* ---- 刻度标记 ---- */
.entropy-bar__mark {
  position: absolute;
  top: -1px;
  font-size: 7px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 700;
  z-index: 1;
  pointer-events: none;
  text-shadow: 0 0 3px rgba(0,0,0,0.6);
}
.mark-50 { left: 50%; transform: translateX(-50%); }
.mark-80 { left: 80%; transform: translateX(-50%); }

/* ---- 百分比文字（居中显示） ---- */
.entropy-bar__text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 9px;
  font-weight: 700;
  color: white;
  text-shadow: 0 0 4px rgba(0,0,0,0.6);
  z-index: 2;
  pointer-events: none;
  white-space: nowrap;
}

/* ---- 状态标签 ---- */
.entropy-bar__status {
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  padding: 1px 5px;
  border-radius: 4px;
}
.status--unstable {
  color: #d97706;
  background: rgba(245, 158, 11, 0.15);
}
.status--critical {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.15);
  animation: status-blink 1s infinite;
}
.status--collapsed {
  color: #fff;
  background: #dc2626;
  font-size: 13px;
}

@keyframes status-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ---- 道具按钮 ---- */
.entropy-bar__action {
  font-size: 11px;
  padding: 2px 6px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
  cursor: pointer;
  background: white;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1.4;
}
.entropy-bar__action:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.entropy-bar__action:active {
  transform: scale(0.95);
}
.btn-stabilizer:hover {
  border-color: #60a5fa;
  background: #eff6ff;
}
.btn-rewind:hover {
  border-color: #a78bfa;
  background: #f5f3ff;
}
.btn-barrier:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}
</style>
