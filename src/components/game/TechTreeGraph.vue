<template>
  <div class="tech-tree-wrap" ref="wrapRef">
    <!-- SVG 树状图 -->
    <svg
      ref="svgRef"
      class="tech-tree-svg"
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- 连接线 -->
      <g v-for="(edge, i) in edges" :key="'e' + i">
        <path
          :d="edge.d"
          :style="{ stroke: edge.active ? 'var(--color-tech-accent)' : 'rgba(255,255,255,0.1)' }"
          :stroke-width="edge.active ? 2 : 1"
          stroke-linecap="round"
          :stroke-dasharray="edge.active ? 'none' : '4,3'"
          fill="none"
        />
        <polygon
          v-if="edge.active"
          :points="edge.arrow"
          :style="{ fill: 'var(--color-tech-accent)' }"
          opacity="0.9"
        />
      </g>

      <!-- 节点 -->
      <g
        v-for="node in nodePositions"
        :key="node.id"
        class="tech-node-g"
        :class="`tech-node-g--${node.status}`"
        @click="onNodeClick(node)"
        @pointerenter="(e) => onNodeHover(node, e)"
        @pointerleave="onNodeLeave"
      >
        <!-- 底座/光晕 -->
        <circle
          v-if="node.status === 'available'"
          :cx="node.x"
          :cy="node.y"
          :r="NODE_R + 5"
          class="tech-halo"
        />
        <!-- 主圆 -->
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="NODE_R"
          :style="{ fill: fillFor(node.status), stroke: strokeFor(node.status) }"
          :stroke-width="node.status === 'available' ? 2.5 : 1.5"
          :stroke-dasharray="node.status === 'locked' ? '4,3' : 'none'"
        />
        <!-- 对勾 -->
        <text
          v-if="node.status === 'unlocked'"
          :x="node.x"
          :y="node.y + 1"
          text-anchor="middle"
          dominant-baseline="central"
          :style="{ fill: 'var(--color-tech-accent)' }"
          font-size="11"
          font-weight="bold"
          class="tech-check"
        >✓</text>
        <!-- 名称标签 -->
        <text
          :x="node.x"
          :y="node.y + NODE_R + 11"
          text-anchor="middle"
          dominant-baseline="central"
          :style="{ fill: node.status === 'locked' ? 'rgba(255,255,255,0.28)' : 'var(--color-tech-accent)' }"
          font-size="8.5"
          font-weight="600"
          class="tech-label"
        >{{ node.name }}</text>
      </g>
    </svg>

    <!-- 底部信息栏：显示当前解锁/可购买状态 -->
    <div class="tech-status-bar">
      <span class="tech-status-item tech-status-item--unlocked">
        <span class="tech-dot tech-dot--unlocked"></span>已解锁
      </span>
      <span class="tech-status-item tech-status-item--available">
        <span class="tech-dot tech-dot--available"></span>可购买
      </span>
      <span class="tech-status-item tech-status-item--locked">
        <span class="tech-dot tech-dot--locked"></span>未解锁
      </span>
    </div>

    <!-- Tooltip（绝对定位，跟随 SVG 比例） -->
    <div
      v-if="tip.show"
      class="tech-tip"
      :class="`tech-tip--${tip.side}`"
      :style="tipStyle"
    >
      <div class="tech-tip__name">{{ tip.name }}</div>
      <div class="tech-tip__desc">{{ tip.desc }}</div>
      <div class="tech-tip__footer">
        <span v-if="tip.status === 'available'" class="tech-tip__cost">
          ✦ {{ tip.cost }} 星尘
        </span>
        <span v-else-if="tip.status === 'unlocked'" class="tech-tip__done">✓ 已研究</span>
        <span v-else class="tech-tip__locked">未解锁</span>
      </div>
      <button
        v-if="tip.status === 'available'"
        class="tech-tip__btn"
        @click.stop="onTipBuy"
      >研究</button>
    </div>

    <!-- 购买确认弹窗 -->
    <transition name="tt-fade">
      <div v-if="pendingNode" class="tech-confirm" @click.self="pendingNode = null">
        <div class="tech-confirm__box">
          <div class="tech-confirm__icon">🔬</div>
          <div class="tech-confirm__name">{{ pendingNode.name }}</div>
          <div class="tech-confirm__desc">{{ pendingNode.description }}</div>
          <div class="tech-confirm__cost">✦ {{ pendingNode.stardustCost }} 星尘</div>
          <div class="tech-confirm__actions">
            <button class="tech-confirm__ok" @click="doBuy">确认</button>
            <button class="tech-confirm__no" @click="pendingNode = null">取消</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { TECH_TREE_DEFS } from '@/core/Constants';
import type { TechNodeDef } from '@/types/game';

const gameStore = useGameStore();
const wrapRef = ref<HTMLElement | null>(null);

// 固定尺寸（viewBox 坐标系，始终不变）
const SVG_W = 160;
const SVG_H = 340;
const NODE_R = 14;
const NODE_X = SVG_W / 2;   // 80
const PADDING_TOP = 26;
const SPACING = 60;          // 节点间距

// ========================
// 节点状态
// ========================
const nodePositions = computed(() => {
  void gameStore.stateVersion;
  const state = gameStore.gameState;

  return TECH_TREE_DEFS.map((def: TechNodeDef, index: number) => {
    const y = PADDING_TOP + index * SPACING;
    const nodeState = state.techTree.get(def.id);
    let status: 'unlocked' | 'available' | 'locked' = 'locked';
    if (nodeState?.unlocked) {
      status = 'unlocked';
    } else if (gameStore.techTreeSystem.canBuy(def.id, state)) {
      status = 'available';
    }
    return { id: def.id, name: def.name, x: NODE_X, y, status, def };
  });
});

// ========================
// 连接线
// ========================
const edges = computed(() => {
  const result: Array<{ d: string; active: boolean; arrow: string }> = [];
  const nodes = nodePositions.value;
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i]!;
    const to = nodes[i + 1]!;
    const fy = from.y + NODE_R;
    const ty = to.y - NODE_R;
    const my = (fy + ty) / 2;
    const d = `M ${from.x} ${fy} C ${from.x} ${my}, ${to.x} ${my}, ${to.x} ${ty}`;
    const active = from.status === 'unlocked';
    const sz = 4.5;
    const ax = to.x;
    const ay = ty - 1;
    const arrow = `${ax},${ay} ${ax - sz},${ay - sz * 1.5} ${ax + sz},${ay - sz * 1.5}`;
    result.push({ d, active, arrow });
  }
  return result;
});

// ========================
// 样式辅助
// ========================
function fillFor(s: string): string {
  if (s === 'unlocked') return 'rgba(var(--color-tech-accent-rgb),0.28)';
  if (s === 'available') return 'rgba(var(--color-tech-accent-rgb),0.16)';
  return 'rgba(255,255,255,0.04)';
}
function strokeFor(s: string): string {
  if (s === 'unlocked') return 'var(--color-tech-accent)';
  if (s === 'available') return 'var(--color-tech-accent)';
  return 'rgba(255,255,255,0.16)';
}

// ========================
// Tooltip
// ========================
const tip = reactive({
  show: false,
  name: '',
  desc: '',
  status: '' as '' | 'unlocked' | 'available' | 'locked',
  cost: 0,
  side: 'right' as 'left' | 'right',
});

const tipStyle = computed(() => {
  if (!wrapRef.value) return {};
  const ww = wrapRef.value.clientWidth;
  const isLeft = tip.side === 'left';
  return {
    [isLeft ? 'right' : 'left']: '105%',
    top: '50%',
    transform: 'translateY(-50%)',
    maxWidth: `${Math.min(ww * 0.9, 160)}px`,
  };
});

function onNodeHover(node: { status: string; def: TechNodeDef; y: number }, _ev: PointerEvent) {
  tip.name = node.def.name;
  tip.desc = node.def.description;
  tip.status = node.status as 'unlocked' | 'available' | 'locked';
  tip.cost = node.def.stardustCost;
  // 简单判断：上半部分放右侧，下半部分放左侧，避免溢出
  tip.side = node.y < SVG_H / 2 ? 'right' : 'left';
  tip.show = true;
}

function onNodeLeave() {
  tip.show = false;
}

// ========================
// 购买
// ========================
const pendingNode = ref<TechNodeDef | null>(null);

function onNodeClick(node: { status: string; def: TechNodeDef }) {
  if (node.status !== 'available') return;
  pendingNode.value = node.def;
}

function onTipBuy() {
  if (tip.status === 'available' && pendingNode.value === null) {
    // 找到对应的 def
    const def = TECH_TREE_DEFS.find(d => d.name === tip.name);
    if (def) pendingNode.value = def;
  }
  tip.show = false;
}

function doBuy() {
  if (pendingNode.value) {
    gameStore.buyTechNode(pendingNode.value.id);
  }
  pendingNode.value = null;
}
</script>

<style scoped>
/* ---- 外层容器 ---- */
.tech-tree-wrap {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* ---- SVG ---- */
.tech-tree-svg {
  width: 100%;
  max-width: 180px;
  height: auto;
  overflow: visible;
}

/* ---- 节点交互 ---- */
.tech-node-g { cursor: default; }
.tech-node-g--available { cursor: pointer; }
.tech-node-g--available:active circle:first-child {
  fill: rgba(var(--color-tech-accent-rgb),0.32);
}
.tech-node-g--unlocked { opacity: 0.7; }
.tech-node-g--locked { opacity: 1; }

/* 光晕动画 */
.tech-halo {
  animation: halo-pulse 2s ease-in-out infinite;
  transform-origin: center;
  transform-box: fill-box;
}
@keyframes halo-pulse {
  0%, 100% { opacity: 0.3; stroke-width: 1.5; }
  50%       { opacity: 0.9; stroke-width: 2.5; }
}

/* ---- 状态指示 ---- */
.tech-status-bar {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
}
.tech-status-item { display: flex; align-items: center; gap: 3px; }
.tech-dot {
  width: 7px; height: 7px; border-radius: 50%;
  display: inline-block;
}
.tech-dot--unlocked  { background: var(--color-narrative); }
.tech-dot--available { background: var(--color-narrative); opacity: 0.5; animation: dot-pulse 2s ease-in-out infinite; }
.tech-dot--locked    { background: rgba(255,255,255,0.18); }
@keyframes dot-pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 1; }
}

/* ---- Tooltip ---- */
.tech-tip {
  position: absolute;
  z-index: 50;
  background: rgba(12, 12, 30, 0.97);
  border: 1px solid rgba(var(--color-tech-accent-rgb), 0.4);
  border-radius: 6px;
  padding: 8px 10px;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.6);
}
.tech-tip__name {
  font-size: 12px; font-weight: 600; color: var(--color-narrative);
  margin-bottom: 3px;
}
.tech-tip__desc {
  font-size: 10px; color: rgba(255,255,255,0.65);
  line-height: 1.4; margin-bottom: 4px;
}
.tech-tip__cost { font-size: 11px; color: var(--color-prestige); font-weight: 500; }
.tech-tip__done { font-size: 10px; color: rgba(255,255,255,0.4); }
.tech-tip__locked { font-size: 10px; color: rgba(255,255,255,0.28); }
.tech-tip__btn {
  margin-top: 5px; width: 100%;
  padding: 3px 0; border-radius: 3px;
  background: rgba(var(--color-tech-accent-rgb),0.2); color: var(--color-narrative);
  font-size: 11px; border: none; cursor: pointer;
  pointer-events: all;
}
.tech-tip__btn:hover { background: rgba(var(--color-tech-accent-rgb),0.35); }

/* ---- 购买弹窗 ---- */
.tech-confirm {
  position: absolute; inset: 0; z-index: 60;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.55); border-radius: 4px;
}
.tech-confirm__box {
  background: rgba(14, 14, 34, 0.98);
  border: 1px solid rgba(var(--color-tech-accent-rgb),0.4);
  border-radius: 8px; padding: 14px 16px 12px;
  min-width: 140px; max-width: 90%;
  text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}
.tech-confirm__icon { font-size: 18px; margin-bottom: 4px; }
.tech-confirm__name { font-size: 14px; font-weight: 600; color: var(--color-narrative); margin-bottom: 3px; }
.tech-confirm__desc { font-size: 11px; color: rgba(255,255,255,0.65); line-height: 1.4; margin-bottom: 6px; }
.tech-confirm__cost { font-size: 13px; color: var(--color-prestige); font-weight: 500; margin-bottom: 10px; }
.tech-confirm__actions { display: flex; gap: 8px; justify-content: center; }
.tech-confirm__ok, .tech-confirm__no {
  padding: 4px 18px; border-radius: 4px; font-size: 12px;
  cursor: pointer; border: none; transition: background 0.15s;
}
.tech-confirm__ok { background: rgba(var(--color-tech-accent-rgb),0.25); color: var(--color-narrative); }
.tech-confirm__ok:hover { background: rgba(var(--color-tech-accent-rgb),0.4); }
.tech-confirm__no { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.5); }
.tech-confirm__no:hover { background: rgba(255,255,255,0.14); }

/* 动画 */
.tt-fade-enter-active, .tt-fade-leave-active { transition: opacity 0.18s; }
.tt-fade-enter-from, .tt-fade-leave-to { opacity: 0; }

/* ---- 移动端适配 ---- */
@media (max-width: 768px) {
  .tech-tree-svg { max-width: 140px; }
  .tech-tip {
    font-size: 11px;
    padding: 6px 8px;
    max-width: 140px !important;
  }
  .tech-confirm__box { padding: 12px 14px 10px; }
}
@media (max-width: 480px) {
  .tech-tree-svg { max-width: 120px; }
}
</style>
