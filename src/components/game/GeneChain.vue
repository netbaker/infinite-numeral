<template>
  <div v-if="visible" class="gene-panel">
    <!-- 标题栏 -->
    <div class="panel-header">
      <h3>🧬 基因链</h3>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>

    <!-- 槽位信息 + 扩容 -->
    <div class="slot-bar">
      <span class="slot-count">槽位：{{ chain.length }}/{{ maxSlots }}</span>
      <button
        class="expand-btn"
        :class="{ 'expand-btn--ready': expandInfo.can }"
        :disabled="!expandInfo.can"
        @click="onExpandClick"
      >
        💎 扩容
        <span v-if="expandInfo.next" class="expand-cost">（需 {{ expandInfo.next.cost }} 奇点核心）</span>
        <span v-else class="expand-cost">（已达上限）</span>
      </button>
    </div>
    <div v-if="expandInfo.next && !expandInfo.can" class="expand-hint">
      ⚠️ {{ expandInfo.reason }}
    </div>

    <!-- 筛选窗口提示 -->
    <div v-if="pendingScreen" class="screen-banner">
      🪓 <strong>筛选窗口开启</strong>：可删除 0-1 条基因（🧠 记忆基因不可删）
      <button class="skip-btn" @click="onSkipScreen">跳过筛选</button>
    </div>

    <!-- 重组提示 -->
    <div v-if="recombinablePairs.length > 0" class="recombine-banner">
      🔗 检测到 {{ recombinablePairs.length }} 对可重组同类基因，点击下方基因的「重组」按钮合并强化。
    </div>

    <!-- DNA 双螺旋 + 基因卡片 -->
    <div class="helix-zone" :style="{ width: rowWidth + 'px' }">
      <svg class="helix-svg" :viewBox="`0 0 ${rowWidth} 150`" :width="rowWidth" height="150">
        <path class="helix-strand" :d="sinePath(0, rowWidth)" :stroke="strandColorA" fill="none" />
        <path class="helix-strand" :d="sinePath(Math.PI, rowWidth)" :stroke="strandColorB" fill="none" />
        <!-- 卡片间贝塞尔连接线（颜色随源基因类型变化） -->
        <path
          v-for="(seg, i) in connectors"
          :key="'c' + i"
          class="helix-connector"
          :d="seg.d"
          :stroke="seg.color"
          fill="none"
        />
      </svg>

      <div class="gene-row" :style="{ width: rowWidth + 'px' }">
        <!-- 已入链基因卡片 -->
        <div
          v-for="gene in chain"
          :key="gene.instanceId"
          class="gene-card"
          :class="cardClass(gene)"
          :style="{ '--gene-color': typeColor(gene.type) }"
          @click="openDetail(gene)"
          @contextmenu.prevent="markForPrune(gene)"
        >
          <!-- 突变闪光层 -->
          <div v-if="isMutating(gene)" class="mutate-flash" />
          <!-- 等级徽章 -->
          <div class="level-badge" :class="levelBadgeClass(gene.level)">Lv{{ gene.level }}</div>
          <!-- 图标 -->
          <div class="gene-icon">{{ defOf(gene.type).icon }}</div>
          <!-- 名称 -->
          <div class="gene-name">{{ defOf(gene.type).name }}</div>
          <!-- 表达强度条 -->
          <div class="expr-bar">
            <div class="expr-fill" :style="{ width: (gene.expression * 100) + '%' }" />
          </div>
          <!-- 待筛选红标 -->
          <div v-if="pendingScreen && defOf(gene.type).canBePruned" class="prune-mark">待筛选</div>

          <!-- 重组按钮 -->
          <button
            v-if="partnerOf(gene)"
            class="recombine-btn"
            @click.stop="onRecombine(gene)"
          >🔗 重组</button>

          <!-- 筛选删除按钮 -->
          <button
            v-if="pendingScreen && defOf(gene.type).canBePruned"
            class="prune-btn"
            @click.stop="onPrune(gene)"
          >🗑 删除</button>
        </div>

        <!-- 空槽 -->
        <div
          v-for="n in (maxSlots - chain.length)"
          :key="'empty' + n"
          class="gene-card gene-card--empty"
        >
          <div class="empty-plus">+</div>
          <div class="empty-label">空槽</div>
        </div>
      </div>
    </div>

    <!-- 暂存区（槽满时 Transcend 获得的新基因） -->
    <div v-if="pendingStash.length > 0" class="stash-zone">
      <h4>📥 待入链区（{{ pendingStash.length }}/{{ stashMax }}）</h4>
      <div class="stash-row">
        <div
          v-for="gene in pendingStash"
          :key="gene.instanceId"
          class="stash-card"
          :style="{ '--gene-color': typeColor(gene.type) }"
        >
          <div class="gene-icon">{{ defOf(gene.type).icon }}</div>
          <div class="gene-name">{{ defOf(gene.type).name }}</div>
          <div class="gene-sub">Lv{{ gene.level }}</div>
          <button
            class="stash-btn"
            :disabled="chain.length >= maxSlots"
            @click="onStashToChain(gene)"
          >{{ chain.length >= maxSlots ? '槽满' : '入链' }}</button>
        </div>
      </div>
    </div>

    <!-- 基因统计 -->
    <div class="gene-stats">
      <h4>📊 基因统计</h4>
      <div class="stat-grid">
        <span>累计突变：{{ stats.totalMutations }}</span>
        <span>累计重组：{{ stats.totalRecombinations }}</span>
        <span>累计筛选：{{ stats.totalPrunings }}</span>
        <span>历史最高 log₁₀：{{ stats.historicalMaxNumber }}</span>
      </div>
    </div>

    <!-- 维度推荐 -->
    <div class="dim-tip">
      💡 当前维度推荐：{{ dimensionRecommendation }}
    </div>

    <!-- 基因详情面板 -->
    <div v-if="selected" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-card" :style="{ '--gene-color': typeColor(selected.type) }">
        <button class="close-btn" @click="closeDetail">✕</button>
        <div class="detail-icon">{{ defOf(selected.type).icon }}</div>
        <h4>{{ defOf(selected.type).name }} <span class="level-badge" :class="levelBadgeClass(selected.level)">Lv{{ selected.level }}</span></h4>
        <p class="detail-desc">{{ defOf(selected.type).description }}</p>
        <div class="detail-row">
          <span>当前等级数值：</span>
          <span class="detail-value">{{ geneEffectText(selected) }}</span>
        </div>
        <div class="detail-row">
          <span>表达强度：</span>
          <span class="detail-value">{{ (selected.expression * 100).toFixed(0) }}%</span>
        </div>
        <div class="detail-row" v-if="selected.entangledProducers">
          <span>纠缠生产者：</span>
          <span class="detail-value">{{ selected.entangledProducers.join(', ') }}</span>
        </div>
        <div class="detail-row" v-if="selected.memoryRecord !== undefined">
          <span>记忆记录值：</span>
          <span class="detail-value">{{ selected.memoryRecord }}</span>
        </div>
        <div class="detail-row">
          <span>突变历史：</span>
          <span class="detail-value">{{ selected.lastMutatedAt ? '最近突变于 ' + new Date(selected.lastMutatedAt).toLocaleTimeString() : '从未突变' }}</span>
        </div>
        <button
          v-if="pendingScreen && defOf(selected.type).canBePruned"
          class="prune-btn detail-prune"
          @click="onPrune(selected)"
        >🗑 删除此基因</button>
      </div>
    </div>

    <!-- 扩容二次确认 -->
    <div v-if="showExpandConfirm" class="detail-overlay" @click.self="showExpandConfirm = false">
      <div class="detail-card confirm-card">
        <h4>确认扩容基因槽？</h4>
        <p>将消耗 <strong>{{ expandInfo.next?.cost }}</strong> 奇点核心，槽位 {{ maxSlots }} → {{ expandInfo.next?.targetSlots }}。</p>
        <div class="confirm-actions">
          <button class="confirm-yes" @click="confirmExpand">确认</button>
          <button class="confirm-no" @click="showExpandConfirm = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { GENE_DEFS, GENE_STASH_MAX } from '@/core/Constants';
import type { GeneState, GeneType } from '@/types/game';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useGameStore();

// ---- 布局常量（用于 DNA 螺旋连接线定位） ----
const CARD_W = 86;
const GAP = 22;
const PAD = 20;

// ---- 响应式基因链数据（依赖 stateVersion 强制刷新） ----
const chain = computed<GeneState[]>(() => {
  void store.stateVersion;
  return store.gameState.geneChain.chain;
});
const maxSlots = computed(() => {
  void store.stateVersion;
  return store.gameState.geneChain.maxSlots;
});
const pendingScreen = computed(() => {
  void store.stateVersion;
  return store.gameState.geneChain.pendingScreen;
});
const pendingStash = computed<GeneState[]>(() => {
  void store.stateVersion;
  return store.gameState.geneChain.pendingStash;
});
const stashMax = GENE_STASH_MAX;
const stats = computed(() => {
  void store.stateVersion;
  const c = store.gameState.geneChain;
  return {
    totalMutations: c.totalMutations,
    totalRecombinations: c.totalRecombinations,
    totalPrunings: c.totalPrunings,
    historicalMaxNumber: c.historicalMaxNumber,
  };
});
const recombinablePairs = computed(() => {
  void store.stateVersion;
  return store.getRecombinablePairs();
});
const expandInfo = computed(() => {
  void store.stateVersion;
  return store.getGeneExpandInfo();
});

// ---- 维度推荐文案（GDD §5.4） ----
const dimensionRecommendation = computed(() => {
  void store.stateVersion;
  const dim = Number(store.gameState.currentDimension);
  const map: Record<number, string> = {
    0: '增殖基因（稳固产出，优先堆叠基础倍率）',
    1: '增殖基因（质数维度产出高，强化生产者）',
    2: '共振基因（混沌维度事件频繁，延长增益）',
    3: '韧性基因（反熵维度频繁坍缩，抬高起点）',
    4: '纠缠基因（奇点维度生产者多，协同放大）',
  };
  return map[dim] ?? '增殖基因（通用首选）';
});

// ---- 基因类型 → 颜色（连接线/卡片主题） ----
const TYPE_COLORS: Record<GeneType, string> = {
  gene_growth: '#4caf50',
  gene_catalyst: '#9c27b0',
  gene_resilience: '#2196f3',
  gene_resonance: '#ff9800',
  gene_mutation: '#e91e63',
  gene_memory: '#00bcd4',
  gene_entangle: '#8bc34a',
  gene_exotic: '#ffd700',
};
function typeColor(t: GeneType): string {
  return TYPE_COLORS[t] ?? '#aaa';
}
const strandColorA = '#7e57c2';
const strandColorB = '#26c6da';

function defOf(type: GeneType) {
  return GENE_DEFS.find((d) => d.id === type)!;
}

// ---- 等级徽章样式 ----
function levelBadgeClass(level: number): string {
  if (level >= 5) return 'badge--rainbow';
  if (level === 4) return 'badge--gold';
  return 'badge--silver';
}

// ---- 当前基因效果文案（用于详情面板） ----
function geneEffectText(g: GeneState): string {
  const def = defOf(g.type);
  const expr = g.expression;
  switch (g.type) {
    case 'gene_growth':
      return `×${(1 + 0.05 * (g.level - 1) * expr).toFixed(3)}（基础产出）`;
    case 'gene_memory': {
      const rec = Number(store.gameState.geneChain.historicalMaxNumber) || 0;
      return `×${(1 + 0.02 * rec * expr).toFixed(3)}（永久全局）`;
    }
    case 'gene_exotic':
      return g.level >= 3
        ? `×${(1 + 0.5 * (g.level - 1) * expr).toFixed(3)}（全局产出）`
        : 'Lv3 后解锁全局产出';
    case 'gene_catalyst':
      return `因子发现门槛 -${Math.round((1 + 0.1 * (g.level - 1) * expr - 1) * 10)} 量级`;
    case 'gene_resilience':
      return `Prestige 起点 ×10^${g.level}`;
    case 'gene_resonance':
      return `事件率 ×${(1 + 0.15 * (g.level - 1) * expr).toFixed(2)}，时长 ×${(1 + 0.1 * (g.level - 1) * expr).toFixed(2)}`;
    case 'gene_entangle':
      return `纠缠生产者协同 ×${(1 + 0.2 * (g.level - 1) * expr).toFixed(2)}`;
    case 'gene_mutation':
      return '每轮 Prestige 随机化为其他类型（高风险高收益）';
    default:
      return def.description;
  }
}

// ---- 重组对查找 ----
function partnerOf(g: GeneState): GeneState | null {
  for (const [a, b] of recombinablePairs.value) {
    if (a.instanceId === g.instanceId) return b;
    if (b.instanceId === g.instanceId) return a;
  }
  return null;
}
const recombinableIds = computed(() => {
  const s = new Set<string>();
  for (const [a, b] of recombinablePairs.value) {
    s.add(a.instanceId);
    s.add(b.instanceId);
  }
  return s;
});

// ---- 突变闪光判定（最近 1.5s 内突变） ----
function isMutating(g: GeneState): boolean {
  return !!g.lastMutatedAt && Date.now() - g.lastMutatedAt < 1500;
}

// ---- DNA 螺旋几何 ----
const rowWidth = computed(() => PAD * 2 + Math.max(1, chain.value.length + (maxSlots.value - chain.value.length)) * (CARD_W + GAP));

function sinePath(phase: number, width: number, height = 150, periods = Math.max(2, Math.round(width / 140)), amp = 34): string {
  const mid = height / 2;
  let d = '';
  const step = 12;
  for (let x = 0; x <= width; x += step) {
    const y = mid + Math.sin((x / width) * Math.PI * 2 * periods + phase) * amp;
    d += (x === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return d;
}

// 卡片中心 x 坐标（用于连接线）
function cardCenterX(i: number): number {
  return PAD + i * (CARD_W + GAP) + CARD_W / 2;
}
const connectors = computed(() => {
  const segs: Array<{ d: string; color: string }> = [];
  for (let i = 0; i < chain.value.length - 1; i++) {
    const x1 = cardCenterX(i);
    const y1 = 75;
    const x2 = cardCenterX(i + 1);
    const y2 = 75;
    const cx = (x1 + x2) / 2;
    const d = `M${x1} ${y1} Q${cx} ${y1 - 40} ${x2} ${y2} Q${cx} ${y2 + 40} ${x1} ${y1}`;
    segs.push({ d, color: typeColor(chain.value[i].type) });
  }
  return segs;
});

// ---- 卡片 CSS class ----
function cardClass(g: GeneState): Record<string, boolean> {
  return {
    'gene-card--mutating': isMutating(g),
    'gene-card--recombinable': recombinableIds.value.has(g.instanceId),
    'gene-card--mutation': g.type === 'gene_mutation',
    'gene-card--pending': pendingScreen.value && defOf(g.type).canBePruned,
  };
}

// ---- 选中详情 ----
const selected = ref<GeneState | null>(null);
function openDetail(g: GeneState) {
  selected.value = g;
}
function closeDetail() {
  selected.value = null;
}

// ---- 操作 ----
function onPrune(g: GeneState) {
  store.pruneGene(g.instanceId);
  if (selected.value && selected.value.instanceId === g.instanceId) closeDetail();
}
function markForPrune(g: GeneState) {
  // 长按 / 右键：打开详情（详情内含删除按钮），简化交互
  openDetail(g);
}
function onRecombine(g: GeneState) {
  const partner = partnerOf(g);
  if (partner) store.recombineGenes(g.instanceId, partner.instanceId);
}
function onSkipScreen() {
  store.skipScreen();
}
function onStashToChain(g: GeneState) {
  store.stashToChain(g.instanceId);
}

// ---- 扩容 ----
const showExpandConfirm = ref(false);
function onExpandClick() {
  if (expandInfo.value.can) showExpandConfirm.value = true;
}
function confirmExpand() {
  store.expandGeneSlot();
  showExpandConfirm.value = false;
}
</script>

<style scoped>
.gene-panel {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: min(860px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(20, 12, 32, 0.97);
  border: 1px solid rgba(157, 39, 176, 0.4);
  border-radius: 12px;
  padding: 16px 20px;
  color: #eee;
  z-index: 200;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--color-border-strong);
  padding-bottom: 8px; margin-bottom: 12px;
}
.panel-header h3 { margin: 0; font-size: 18px; color: #e1bee7; }
.close-btn {
  background: none; border: none; color: #ccc; font-size: 18px; cursor: pointer;
}
.close-btn:hover { color: #fff; }

.slot-bar { display: flex; align-items: center; gap: 16px; margin-bottom: 6px; }
.slot-count { font-weight: 600; color: #ce93d8; }
.expand-btn {
  background: rgba(106, 27, 154, 0.5);
  border: 1px solid rgba(171, 71, 188, 0.6);
  color: #fff; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;
}
.expand-btn--ready { background: rgba(106, 27, 154, 0.9); box-shadow: 0 0 10px rgba(171, 71, 188, 0.5); }
.expand-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.expand-cost { font-size: 11px; opacity: 0.85; }
.expand-hint { color: #ffb74d; font-size: 12px; margin-bottom: 6px; }

.screen-banner, .recombine-banner {
  font-size: 13px; padding: 6px 10px; border-radius: 6px; margin-bottom: 10px;
}
.screen-banner { background: rgba(244, 67, 54, 0.15); border: 1px solid rgba(244, 67, 54, 0.4); }
.recombine-banner { background: rgba(76, 175, 80, 0.15); border: 1px solid rgba(76, 175, 80, 0.4); }
.skip-btn {
  margin-left: 8px; background: none; border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff; border-radius: 4px; cursor: pointer; padding: 1px 8px; font-size: 12px;
}

/* ---- DNA 螺旋区 ---- */
.helix-zone { position: relative; margin: 8px 0 4px; overflow-x: auto; }
.helix-svg { display: block; }
.helix-strand {
  stroke-width: 2.5; opacity: 0.55;
  stroke-dasharray: 6 8;
  animation: strand-flow 6s linear infinite;
}
.helix-connector { stroke-width: 2; opacity: 0.7; }
@keyframes strand-flow { to { stroke-dashoffset: -140; } }

.gene-row {
  position: absolute; top: 8px; left: 0;
  display: flex; gap: 22px; padding: 0 20px;
}
.gene-card {
  position: relative;
  width: 86px; height: 110px;
  flex-shrink: 0;
  border-radius: 10px;
  background: rgba(40, 20, 60, 0.85);
  border: 2px solid var(--gene-color, var(--color-text-dim));
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  cursor: pointer; user-select: none;
  transition: transform 0.15s, box-shadow 0.15s;
}
.gene-card:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
.gene-icon { font-size: 30px; line-height: 1; }
.gene-name { font-size: 11px; margin-top: 4px; color: #f3e5f5; text-align: center; }
.expr-bar {
  width: 70%; height: 4px; margin-top: 6px;
  background: var(--color-border-strong); border-radius: 2px; overflow: hidden;
}
.expr-fill { height: 100%; background: var(--gene-color, #fff); transition: width 0.3s; }
.level-badge {
  position: absolute; top: -8px; right: -8px;
  min-width: 28px; height: 20px; padding: 0 4px;
  border-radius: 10px; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.4);
}
.badge--silver { background: #b0bec5; color: #263238; }
.badge--gold { background: linear-gradient(135deg, var(--color-milestone), #ffb300); color: #3e2723; }
.badge--rainbow { background: linear-gradient(135deg, #ff5252, #ffeb3b, #69f0ae, #40c4ff, #e040fb); color: #1a1a1a; }

/* 突变闪光 */
.gene-card--mutating { animation: mutate-flash 0.5s ease-out; }
@keyframes mutate-flash {
  0% { box-shadow: 0 0 0 2px #ce93d8, 0 0 24px 6px rgba(206, 147, 216, 0.9); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
.mutate-flash {
  position: absolute; inset: 0; border-radius: 10px;
  background: radial-gradient(circle, rgba(206,147,216,0.6), transparent 70%);
  animation: flash-fade 0.5s ease-out; pointer-events: none;
}
@keyframes flash-fade { from { opacity: 1; } to { opacity: 0; } }

/* 可重组高亮 */
.gene-card--recombinable { border-color: var(--color-growth); box-shadow: 0 0 12px rgba(76, 175, 80, 0.5); }

/* 突变基因彩虹流动边框 */
.gene-card--mutation {
  border-image: linear-gradient(90deg, #ff5252, #ffeb3b, #69f0ae, #40c4ff, #e040fb, #ff5252) 1;
  animation: rainbow-border 3s linear infinite;
}
@keyframes rainbow-border { to { filter: hue-rotate(360deg); } }

/* 待筛选红标 */
.gene-card--pending { border-color: var(--color-cost); }
.prune-mark {
  position: absolute; top: -8px; left: -8px;
  background: var(--color-cost); color: #fff; font-size: 9px; padding: 1px 4px; border-radius: 6px;
}
.prune-btn, .recombine-btn {
  position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
  font-size: 10px; padding: 2px 6px; border-radius: 4px; border: none; cursor: pointer; white-space: nowrap;
}
.prune-btn { background: var(--color-cost); color: #fff; }
.recombine-btn { background: var(--color-growth); color: #fff; }

/* 空槽 */
.gene-card--empty {
  border-style: dashed; border-color: rgba(255, 255, 255, 0.25); background: rgba(255,255,255,0.04); cursor: default;
}
.empty-plus { font-size: 28px; color: rgba(255,255,255,0.5); line-height: 1; }
.empty-label { font-size: 11px; color: rgba(255,255,255,0.5); }

/* 暂存区 */
.stash-zone { margin-top: 28px; }
.stash-zone h4, .gene-stats h4 { margin: 8px 0 6px; font-size: 14px; color: #ce93d8; }
.stash-row { display: flex; gap: 10px; flex-wrap: wrap; }
.stash-card {
  width: 96px; padding: 8px; border-radius: 8px; text-align: center;
  background: rgba(40, 20, 60, 0.7); border: 1px solid var(--gene-color, var(--color-text-dim));
}
.stash-card .gene-icon { font-size: 24px; }
.stash-card .gene-name { font-size: 11px; }
.stash-card .gene-sub { font-size: 11px; color: #b39ddb; }
.stash-btn {
  margin-top: 4px; width: 100%; font-size: 11px; padding: 2px 0;
  background: rgba(106, 27, 154, 0.7); color: #fff; border: none; border-radius: 4px; cursor: pointer;
}
.stash-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* 统计 */
.gene-stats { margin-top: 12px; }
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 12px; color: #d1c4e9; }

.dim-tip {
  margin-top: 12px; padding: 8px 10px; border-radius: 6px;
  background: rgba(33, 150, 243, 0.12); border: 1px solid rgba(33, 150, 243, 0.3);
  font-size: 12px; color: #90caf9;
}

/* 详情 / 确认 */
.detail-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 300;
}
.detail-card {
  position: relative; width: min(420px, 90vw);
  background: rgba(28, 16, 44, 0.98); border: 1px solid var(--gene-color, var(--color-text-dim));
  border-radius: 12px; padding: 18px 20px; color: #eee;
}
.detail-card h4 { margin: 4px 0 10px; color: #e1bee7; }
.detail-icon { font-size: 36px; }
.detail-desc { font-size: 13px; color: #d1c4e9; margin: 6px 0 12px; }
.detail-row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
.detail-value { color: #fff; font-weight: 600; }
.detail-prune { width: 100%; margin-top: 12px; padding: 6px; }
.confirm-card { width: min(360px, 90vw); }
.confirm-card p { font-size: 13px; color: #d1c4e9; }
.confirm-actions { display: flex; gap: 10px; margin-top: 12px; }
.confirm-yes { flex: 1; background: var(--color-growth); color: #fff; border: none; border-radius: 6px; padding: 6px; cursor: pointer; }
.confirm-no { flex: 1; background: var(--color-border-strong); color: #fff; border: none; border-radius: 6px; padding: 6px; cursor: pointer; }
</style>
