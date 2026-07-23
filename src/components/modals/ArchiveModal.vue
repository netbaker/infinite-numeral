<template>
  <div v-if="visible" class="archive-modal">
    <!-- 标题栏 -->
    <div class="panel-header">
      <h3>🏛️ 宇宙档案馆</h3>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>

    <!-- 未解锁占位 -->
    <div v-if="!store.archiveUnlocked" class="locked-state">
      🔒 宇宙档案馆尚未解锁。<br />
      累计超越 <strong>5</strong> 次后，你的每一次轮回都将被永久记录于此。
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 加载态 -->
      <div v-if="store.archiveLoading" class="loading-state">📡 正在调取档案馆档案……</div>

      <!-- 空态 -->
      <div v-else-if="store.archiveRecords.length === 0" class="empty-state">
        📭 暂无档案。完成下一次超越后，本轮轮回将被记录于此。
      </div>

      <template v-else>
        <!-- 统计摘要 -->
        <div class="summary-bar">
          <div class="summary-item">
            <span class="summary-label">档案总数</span>
            <span class="summary-value">{{ summary.totalRuns }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">历史最高 log₁₀</span>
            <span class="summary-value">{{ fmt(summary.allTimeMaxLog10) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">总游戏时长</span>
            <span class="summary-value">{{ fmtDuration(summary.totalPlayTime) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">累计超越</span>
            <span class="summary-value">{{ summary.totalTranscends }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">累计熵崩</span>
            <span class="summary-value">{{ summary.totalCollapses }}</span>
          </div>
        </div>

        <!-- 工具栏：筛选 / 排序 / 对比模式 -->
        <div class="toolbar">
          <div class="filter-tabs">
            <button
              v-for="tab in filterTabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ 'tab-btn--active': filter === tab.key }"
              @click="filter = tab.key"
            >{{ tab.label }}</button>
          </div>
          <div class="sort-group">
            <label>排序</label>
            <select v-model="sortKey" class="sort-select">
              <option value="timestamp">时间</option>
              <option value="maxLog10">最高数字</option>
              <option value="runDuration">时长</option>
              <option value="transcendCount">超越次数</option>
            </select>
            <button class="sort-dir" @click="sortDir = sortDir === 'desc' ? 'asc' : 'desc'">
              {{ sortDir === 'desc' ? '↓' : '↑' }}
            </button>
          </div>
          <button
            class="compare-toggle"
            :class="{ 'compare-toggle--on': compareMode }"
            @click="toggleCompareMode"
          >{{ compareMode ? '退出对比' : '对比模式' }}</button>
        </div>

        <!-- 卡片网格 -->
        <div class="card-grid">
          <div
            v-for="rec in visibleRecords"
            :key="rec.runId"
            class="arch-card"
            :class="{
              'arch-card--milestone': rec.isMilestone,
              'arch-card--selected': isSelected(rec),
            }"
            @click="onCardClick(rec)"
          >
            <div class="card-top">
              <span class="card-run">#{{ rec.transcendCount }}</span>
              <span v-if="rec.isMilestone" class="card-star" title="里程碑">★</span>
            </div>
            <div class="card-log10">log₁₀ {{ fmt(rec.maxLog10) }}</div>
            <div class="card-dim">主维度：{{ dimName(rec.primaryDimension) }}</div>
            <div class="card-meta">
              <span>⏱ {{ fmtDuration(rec.runDuration) }}</span>
              <span>💥 {{ rec.collapsesTriggered }}</span>
            </div>
            <div class="card-genes">
              <span
                v-for="g in rec.geneChainSnapshot"
                :key="g.type"
                class="gene-chip"
                :title="g.type + ' Lv' + g.level"
              >{{ geneIcon(g.type) }}{{ g.level }}</span>
            </div>
            <div class="card-foot">
              <span v-if="compareMode" class="card-select-hint">
                {{ isSelected(rec) ? '已选' : '点击选择' }}
              </span>
              <button
                v-if="!rec.isMilestone"
                class="card-del"
                title="删除此档案（非里程碑）"
                @click.stop="deleteRecord(rec)"
              >🗑</button>
            </div>
          </div>
        </div>

        <!-- 档案成就 -->
        <div class="arch-ach">
          <div class="arch-ach__header">
            <span class="arch-ach__title">🏛️ 档案成就</span>
            <span class="arch-ach__progress">{{ archiveUnlockedCount }} / {{ archiveAchievements.length }}</span>
          </div>
          <div class="arch-ach__grid">
            <div
              v-for="item in archiveAchievementList"
              :key="item.def.id"
              class="arch-ach__tile"
              :class="{ 'arch-ach__tile--unlocked': item.unlocked }"
              :title="item.unlocked ? ('已解锁 · ' + (item.unlockedAtText ?? '')) : '尚未解锁'"
            >
              <div class="arch-ach__icon">{{ item.unlocked ? item.def.icon : '🔒' }}</div>
              <div class="arch-ach__body">
                <div class="arch-ach__name">{{ item.def.name }}</div>
                <div class="arch-ach__desc">{{ item.def.description }}</div>
                <div class="arch-ach__foot">
                  <span class="arch-ach__status">
                    {{ item.unlocked ? '✓ 已解锁' : '🔒 未解锁' }}
                  </span>
                  <span v-if="item.def.rewardSingularity" class="arch-ach__reward">
                    奇点 +{{ item.def.rewardSingularity }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 对比面板 -->
        <div v-if="cmp" class="compare-panel">
          <h4>⚖️ 对比：#{{ compareSelection[0].transcendCount }} vs #{{ compareSelection[1].transcendCount }}</h4>
          <div class="compare-grid">
            <div class="compare-row compare-row--head">
              <span>指标</span><span>A</span><span>B</span>
            </div>
            <div class="compare-row">
              <span>最高 log₁₀</span>
              <span :class="cmpClass(cmp.maxLog10.a, cmp.maxLog10.b)">{{ fmt(cmp.maxLog10.a) }}</span>
              <span :class="cmpClass(cmp.maxLog10.b, cmp.maxLog10.a)">{{ fmt(cmp.maxLog10.b) }}</span>
            </div>
            <div class="compare-row">
              <span>本轮时长</span>
              <span>{{ fmtDuration(cmp.runDuration.a) }}</span>
              <span>{{ fmtDuration(cmp.runDuration.b) }}</span>
            </div>
            <div class="compare-row">
              <span>效率 (log₁₀/秒)</span>
              <span>{{ fmt(cmp.runDuration.efficiencyA) }}</span>
              <span>{{ fmt(cmp.runDuration.efficiencyB) }}</span>
            </div>
            <div class="compare-row">
              <span>Prestige 次数</span>
              <span>{{ cmp.prestigeCount.a }}</span>
              <span>{{ cmp.prestigeCount.b }}</span>
            </div>
            <div class="compare-row">
              <span>事件触发</span>
              <span>{{ cmp.eventsTriggered.a }}</span>
              <span>{{ cmp.eventsTriggered.b }}</span>
            </div>
          </div>
          <div class="compare-genes">
            <div>
              <strong>A 基因链</strong>
              <span
                v-for="g in cmp.geneChain.a"
                :key="g.type"
                class="gene-chip"
              >{{ geneIcon(g.type) }}{{ g.level }}</span>
            </div>
            <div>
              <strong>B 基因链</strong>
              <span
                v-for="g in cmp.geneChain.b"
                :key="g.type"
                class="gene-chip"
              >{{ geneIcon(g.type) }}{{ g.level }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { compareRecords } from '@/systems/ArchiveSystem';
import { DIMENSION_DEFS, ACHIEVEMENT_DEFS } from '@/core/Constants';
import { format } from '@/core/Formatter';
import { BigNumber } from '@/core/BigNumber';
import type { ArchiveRecordDB } from '@/db/database';
import type { GeneType, CompareResult } from '@/types/game';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useGameStore();

// ---- 筛选 / 排序 / 对比 ----
type FilterKey = 'all' | 'milestone' | 'dimension';
const filter = ref<FilterKey>('all');
const sortKey = ref<'timestamp' | 'maxLog10' | 'runDuration' | 'transcendCount'>('timestamp');
const sortDir = ref<'asc' | 'desc'>('desc');
const compareMode = ref(false);
const compareSelection = ref<ArchiveRecordDB[]>([]);

const filterTabs: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'milestone', label: '里程碑 ★' },
  { key: 'dimension', label: '按主维度' },
];

const summary = computed(() => store.archiveSummary);

// ---- 档案成就（group: 'archive'，仅由 ArchiveSystem.evaluateSpecialAchievements 解锁）----
// 数据来源：store.gameState.achievements（Map<string, AchievementState>）。
// 未解锁的档案成就在 Map 中无条目（普通 checkAchievements 跳过 archive 组），
// 因此 get(id) 返回 undefined 时统一视为"未解锁"。
const archiveAchievements = ACHIEVEMENT_DEFS.filter((d) => d.group === 'archive');

interface ArchiveAchView {
  def: (typeof archiveAchievements)[number];
  unlocked: boolean;
  unlockedAt?: number;
  unlockedAtText?: string;
}

const archiveAchievementList = computed<ArchiveAchView[]>(() => {
  // 读取 stateVersion 以建立响应式依赖（achievements 存于 shallowRef 的 GameState 中）
  void store.stateVersion;
  return archiveAchievements.map((def) => {
    const st = store.gameState.achievements.get(def.id);
    const unlocked = st?.unlocked ?? false;
    const unlockedAt = st?.unlockedAt;
    return {
      def,
      unlocked,
      unlockedAt,
      unlockedAtText: unlockedAt
        ? new Date(unlockedAt).toLocaleString('zh-CN', {
            month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
          })
        : undefined,
    };
  });
});

const archiveUnlockedCount = computed(
  () => archiveAchievementList.value.filter((a) => a.unlocked).length,
);

const visibleRecords = computed<ArchiveRecordDB[]>(() => {
  let list = store.archiveRecords;
  if (filter.value === 'milestone') {
    list = list.filter((r) => r.isMilestone);
  } else if (filter.value === 'dimension') {
    // 按主维度分组：优先展示停留最久维度，这里简单按 primaryDimension 升序聚合
    list = [...list].sort((a, b) => a.primaryDimension - b.primaryDimension);
  }
  const dir = sortDir.value === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const av = a[sortKey.value];
    const bv = b[sortKey.value];
    return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
  });
});

const cmp = computed<CompareResult | null>(() => {
  if (compareSelection.value.length !== 2) return null;
  return compareRecords(compareSelection.value[0], compareSelection.value[1]);
});

// ---- 维度名 / 基因图标 ----
const dimNameMap: Record<number, string> = Object.fromEntries(
  DIMENSION_DEFS.map((d) => [d.id, d.name]),
);
function dimName(id: number): string {
  return dimNameMap[id] ?? `维度${id}`;
}
const GENE_ICONS: Record<GeneType, string> = {
  gene_growth: '🌱', gene_catalyst: '⚗️', gene_resilience: '🛡️', gene_resonance: '🔔',
  gene_mutation: '🎲', gene_memory: '🧠', gene_entangle: '🔗', gene_exotic: '✨',
};
function geneIcon(t: GeneType): string {
  return GENE_ICONS[t] ?? '🧬';
}

// ---- 格式化 ----
function fmt(n: number): string {
  if (!isFinite(n)) return '—';
  return format(BigNumber.from(n));
}
function fmtDuration(sec: number): string {
  if (sec < 60) return `${Math.floor(sec)}秒`;
  if (sec < 3600) return `${Math.floor(sec / 60)}分`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}时`;
  return `${(sec / 86400).toFixed(1)}天`;
}

// ---- 对比选择 ----
function toggleCompareMode(): void {
  compareMode.value = !compareMode.value;
  compareSelection.value = [];
}
function isSelected(rec: ArchiveRecordDB): boolean {
  return compareSelection.value.some((r) => r.runId === rec.runId);
}
function onCardClick(rec: ArchiveRecordDB): void {
  if (!compareMode.value) return;
  if (isSelected(rec)) {
    compareSelection.value = compareSelection.value.filter((r) => r.runId !== rec.runId);
  } else {
    if (compareSelection.value.length >= 2) {
      compareSelection.value = [compareSelection.value[1]];
    }
    compareSelection.value.push(rec);
  }
}
function cmpClass(a: number, other: number): string {
  if (a > other) return 'cmp-better';
  if (a < other) return 'cmp-worse';
  return '';
}

// ---- 删除 ----
async function deleteRecord(rec: ArchiveRecordDB): Promise<void> {
  if (rec.isMilestone) return; // 里程碑不可删除
  await store.removeArchive(rec.id);
}

// ---- 打开时加载 ----
watch(
  () => props.visible,
  async (v) => {
    if (v && store.archiveUnlocked) {
      await store.loadArchives();
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.archive-modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: min(900px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  background: rgba(18, 20, 34, 0.97);
  border: 1px solid rgba(255, 215, 0, 0.35);
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
.panel-header h3 { margin: 0; font-size: 18px; color: #ffe082; }
.close-btn {
  background: none; border: none; color: #ccc; font-size: 18px; cursor: pointer;
}
.close-btn:hover { color: #fff; }

.locked-state {
  padding: 40px 20px; text-align: center; line-height: 1.8;
  color: #b0bec5; font-size: 14px;
}
.locked-state strong { color: var(--color-milestone); }

.loading-state, .empty-state {
  padding: 40px 20px; text-align: center; color: #90a4ae; font-size: 14px;
}

/* 摘要栏 */
.summary-bar {
  display: flex; flex-wrap: wrap; gap: 10px 20px;
  padding: 10px 12px; margin-bottom: 12px;
  background: rgba(255, 215, 0, 0.06); border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 8px;
}
.summary-item { display: flex; flex-direction: column; }
.summary-label { font-size: 11px; color: #b0bec5; }
.summary-value { font-size: 16px; font-weight: 700; color: #ffe082; }

/* 工具栏 */
.toolbar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 12px;
}
.filter-tabs { display: flex; gap: 4px; }
.tab-btn {
  background: var(--color-border); border: 1px solid rgba(255,255,255,0.12);
  color: #cfd8dc; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;
}
.tab-btn--active { background: rgba(255, 215, 0, 0.18); border-color: rgba(255, 215, 0, 0.5); color: #ffe082; }
.sort-group { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #b0bec5; }
.sort-select {
  background: var(--color-border); color: #eee; border: 1px solid var(--color-border-strong);
  border-radius: 4px; padding: 3px 6px; font-size: 12px;
}
.sort-dir {
  background: var(--color-border); border: 1px solid var(--color-border-strong);
  color: #eee; border-radius: 4px; padding: 3px 8px; cursor: pointer;
}
.compare-toggle {
  margin-left: auto; background: rgba(33, 150, 243, 0.18); border: 1px solid rgba(33, 150, 243, 0.5);
  color: #90caf9; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;
}
.compare-toggle--on { background: rgba(33, 150, 243, 0.5); color: #fff; }

/* 卡片网格 */
.card-grid {
  display: grid; grid-template-columns: repeat(auto-fill, 160px); gap: 12px;
  justify-content: start;
}
.arch-card {
  width: 160px; height: 200px;
  border-radius: 10px; padding: 10px;
  background: rgba(40, 44, 66, 0.85); border: 1px solid rgba(255,255,255,0.12);
  display: flex; flex-direction: column; gap: 4px; cursor: default;
  transition: transform 0.15s, box-shadow 0.15s;
}
.arch-card:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
.arch-card--milestone {
  border-color: var(--color-milestone);
  background: linear-gradient(160deg, rgba(60, 50, 20, 0.85), rgba(40, 44, 66, 0.85));
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.25);
}
.arch-card--selected { outline: 2px solid #2196f3; }
.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-run { font-weight: 700; color: #cfd8dc; font-size: 13px; }
.card-star { color: var(--color-milestone); font-size: 16px; }
.card-log10 { font-size: 15px; font-weight: 700; color: #80deea; }
.card-dim { font-size: 12px; color: #b0bec5; }
.card-meta { display: flex; justify-content: space-between; font-size: 11px; color: #90a4ae; }
.card-genes { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 2px; }
.gene-chip {
  font-size: 10px; padding: 1px 4px; border-radius: 4px;
  background: var(--color-border); border: 1px solid rgba(255,255,255,0.12);
}
.card-foot { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
.card-select-hint { font-size: 10px; color: #90caf9; }
.card-del {
  background: none; border: none; cursor: pointer; font-size: 13px; opacity: 0.6;
}
.card-del:hover { opacity: 1; }

/* 对比面板 */
.compare-panel {
  margin-top: 16px; padding: 12px;
  background: rgba(33, 150, 243, 0.06); border: 1px solid rgba(33, 150, 243, 0.3);
  border-radius: 8px;
}
.compare-panel h4 { margin: 0 0 8px; color: #90caf9; font-size: 14px; }
.compare-grid { display: flex; flex-direction: column; gap: 2px; }
.compare-row {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;
  font-size: 12px; padding: 3px 6px; border-radius: 4px;
}
.compare-row--head { color: #b0bec5; font-weight: 600; }
.compare-row:nth-child(even) { background: var(--color-border); }
.cmp-better { color: #69f0ae; font-weight: 700; }
.cmp-worse { color: #ef9a9a; }
.compare-genes { display: flex; gap: 24px; margin-top: 10px; font-size: 12px; color: #cfd8dc; }
.compare-genes strong { color: #90caf9; margin-right: 6px; }
.compare-genes .gene-chip { margin-right: 3px; }

/* 档案成就 */
.arch-ach {
  margin-top: 16px; padding: 12px;
  background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.18);
  border-radius: 8px;
}
.arch-ach__header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;
}
.arch-ach__title { font-size: 15px; font-weight: 700; color: #ffe082; }
.arch-ach__progress { font-size: 12px; color: #b0bec5; }
.arch-ach__grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px;
}
.arch-ach__tile {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 8px 10px; border-radius: 8px;
  background: rgba(40, 44, 66, 0.6); border: 1px solid rgba(255, 255, 255, 0.12);
  opacity: 0.55; transition: opacity 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.arch-ach__tile--unlocked {
  opacity: 1; border-color: rgba(255, 215, 0, 0.5);
  background: linear-gradient(160deg, rgba(60, 50, 20, 0.6), rgba(40, 44, 66, 0.6));
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
}
.arch-ach__icon { font-size: 22px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
.arch-ach__body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.arch-ach__name { font-size: 13px; font-weight: 600; color: #cfd8dc; }
.arch-ach__tile--unlocked .arch-ach__name { color: #ffe082; }
.arch-ach__desc { font-size: 11px; color: #90a4ae; line-height: 1.4; }
.arch-ach__foot { display: flex; align-items: center; gap: 8px; margin-top: 2px; flex-wrap: wrap; }
.arch-ach__status { font-size: 10px; color: #90a4ae; }
.arch-ach__tile--unlocked .arch-ach__status { color: #69f0ae; }
.arch-ach__reward { font-size: 10px; color: rgba(255, 215, 0, 0.7); }
</style>
