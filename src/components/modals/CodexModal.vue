<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import {
  CODEX_DEFS,
  CODEX_CATEGORY_META,
  type CodexCategory,
  type CodexEntryDef,
} from '@/types/codex';
import * as codexSystem from '@/systems/CodexSystem';
import { CODEX_CATEGORIES } from '@/systems/CodexSystem';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useGameStore();

const activeCategory = ref<CodexCategory>('origin');

/** 各分类进度（GDD §5） */
const categoryCounts = computed(() => {
  void store.stateVersion;
  return codexSystem.getCategoryCounts(store.gameState);
});

/** 总收录进度（按 CODEX_CATEGORIES 泛型汇总，自动计入 knowledge 等新增分类） */
const totalProgress = computed(() => {
  const c = categoryCounts.value;
  let unlocked = 0;
  let all = 0;
  for (const cat of CODEX_CATEGORIES) {
    unlocked += c[cat].unlocked;
    all += c[cat].total;
  }
  const pct = all > 0 ? (unlocked / all) * 100 : 0;
  return { unlocked, all, pct };
});

/** 当前分类下展示的词条（非未解之谜：仅显示已收录；未解之谜：始终显示，未解锁为模糊卡片） */
const visibleEntries = computed<CodexEntryDef[]>(() => {
  void store.stateVersion;
  return CODEX_DEFS.filter((d) => d.category === activeCategory.value);
});

function isUnlocked(def: CodexEntryDef): boolean {
  const st = store.gameState.codexEntries.get(def.id);
  return !!st && st.unlocked;
}

function unlockedAt(def: CodexEntryDef): number | undefined {
  return store.gameState.codexEntries.get(def.id)?.unlockedAt;
}

function isNew(def: CodexEntryDef): boolean {
  const st = store.gameState.codexEntries.get(def.id);
  return codexSystem.isNewlyUnlocked(st);
}

function isHighlight(def: CodexEntryDef): boolean {
  return store.codexHighlightId === def.id;
}

function formatTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function switchCategory(cat: CodexCategory): void {
  activeCategory.value = cat;
}

/** 打开时若带定位词条，自动切到其分类 */
watch(
  () => props.visible,
  (v) => {
    if (v && store.codexHighlightId) {
      const def = CODEX_DEFS.find((d) => d.id === store.codexHighlightId);
      if (def) activeCategory.value = def.category;
    }
  },
  { immediate: true },
);

const meta = CODEX_CATEGORY_META;
</script>

<template>
  <div v-if="visible" class="codex-overlay" @click.self="emit('close')">
    <div class="codex-modal">
      <!-- 头部 -->
      <div class="codex-header">
        <span class="codex-title">📖 数字神话图鉴</span>
        <button class="codex-close" @click="emit('close')">✕</button>
      </div>

      <!-- 总进度 -->
      <div class="codex-progress-total">
        <div class="codex-progress-row">
          <span
            v-for="cat in CODEX_CATEGORIES"
            :key="cat"
            class="codex-chip"
            :style="{ borderColor: meta[cat].color, color: meta[cat].color }"
          >
            {{ meta[cat].icon }} {{ meta[cat].label }} ({{ categoryCounts[cat].unlocked }}/{{ categoryCounts[cat].total }})
          </span>
        </div>
        <div class="codex-total-bar">
          <div class="codex-total-fill" :style="{ width: totalProgress.pct + '%' }" />
        </div>
        <div class="codex-total-text">
          总收录：{{ totalProgress.unlocked }}/{{ totalProgress.all }} ({{ totalProgress.pct.toFixed(1) }}%)
        </div>
      </div>

      <!-- 分类标签 -->
      <div class="codex-tabs">
        <button
          v-for="cat in CODEX_CATEGORIES"
          :key="cat"
          class="codex-tab"
          :class="{ 'codex-tab--active': activeCategory === cat }"
          :style="activeCategory === cat ? { background: meta[cat].color + '22', borderColor: meta[cat].color, color: meta[cat].color } : {}"
          @click="switchCategory(cat)"
        >
          {{ meta[cat].icon }} {{ meta[cat].label }}
          <span class="codex-tab-count">{{ categoryCounts[cat].unlocked }}/{{ categoryCounts[cat].total }}</span>
        </button>
      </div>

      <!-- 词条列表 -->
      <div class="codex-list">
        <template v-for="def in visibleEntries" :key="def.id">
          <!-- 未解之谜：未解锁 → 模糊卡片 -->
          <div
            v-if="def.category === 'mystery' && !isUnlocked(def)"
            class="codex-card codex-card--hidden"
            :class="{ 'codex-card--highlight': isHighlight(def) }"
          >
            <div class="codex-card-head">
              <span class="codex-card-icon">❓</span>
              <span class="codex-card-title codex-blur">??????????</span>
              <span class="codex-lock">🔒</span>
            </div>
            <p class="codex-card-body codex-blur">????????????????????????????????????????????????????</p>
            <div class="codex-hint">💡 提示：{{ def.hiddenHint }}</div>
          </div>

          <!-- 未解之谜：已解锁 / 其他分类已收录 → 正常卡片 -->
          <div
            v-else-if="isUnlocked(def)"
            class="codex-card"
            :class="['codex-card--' + def.category, { 'codex-card--new': isNew(def), 'codex-card--highlight': isHighlight(def) }]"
            :style="{ borderLeftColor: meta[def.category].color }"
          >
            <div class="codex-card-head">
              <span class="codex-card-icon">{{ def.icon }}</span>
              <span class="codex-card-title">{{ def.title }}</span>
              <span v-if="isNew(def)" class="codex-new">NEW</span>
              <span v-if="def.category === 'mystery'" class="codex-key">🔑</span>
              <span v-if="def.category === 'knowledge' && def.unlockLog10 != null" class="codex-magnitude">量级 e{{ def.unlockLog10 }}</span>
              <span v-if="def.category === 'knowledge'" class="codex-real">📐 真实知识</span>
            </div>
            <p v-for="(para, i) in def.content" :key="i" class="codex-card-body">{{ para }}</p>
            <div v-if="def.category === 'mystery' && def.hiddenHint" class="codex-unlock-cond">
              🔓 解锁线索：{{ def.hiddenHint }}
            </div>
            <div class="codex-card-foot">
              <span class="codex-source">{{ meta[def.category].label }}</span>
              <span v-if="unlockedAt(def)">收录于：{{ formatTime(unlockedAt(def)) }}</span>
            </div>
          </div>

          <!-- 其他分类未收录 → 不显示 -->
        </template>

        <div v-if="visibleEntries.length === 0" class="codex-empty">该分类暂无词条</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.codex-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.codex-modal {
  width: min(680px, 94vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: #1a0d2e;
  border: 1px solid #4a3a6a;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  color: #ece6f5;
  font-family: 'Noto Sans SC', system-ui, sans-serif;
  overflow: hidden;
}
.codex-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #3a2a5a;
}
.codex-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
}
.codex-close {
  background: transparent;
  border: none;
  color: #b9a9d6;
  font-size: 18px;
  cursor: pointer;
}
.codex-close:hover {
  color: #fff;
}
.codex-progress-total {
  padding: 12px 18px;
  border-bottom: 1px solid #2a1f44;
}
.codex-progress-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.codex-chip {
  font-size: 12px;
  padding: 3px 8px;
  border: 1px solid;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}
.codex-total-bar {
  height: 8px;
  border-radius: 5px;
  background: var(--color-border);
  overflow: hidden;
}
.codex-total-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-milestone), var(--color-chaos-accent));
  transition: width 0.4s ease;
}
.codex-total-text {
  margin-top: 6px;
  font-size: 12px;
  color: #c9bce6;
}
.codex-tabs {
  display: flex;
  gap: 6px;
  padding: 10px 18px;
  flex-wrap: wrap;
  border-bottom: 1px solid #2a1f44;
}
.codex-tab {
  flex: 1 1 auto;
  min-width: 120px;
  padding: 8px 10px;
  border: 1px solid #3a2a5a;
  border-radius: 10px;
  background: var(--color-border);
  color: #c9bce6;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}
.codex-tab-count {
  font-size: 11px;
  opacity: 0.8;
}
.codex-list {
  padding: 14px 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.codex-card {
  background: rgba(30, 20, 50, 0.85);
  border-left: 4px solid #6a5a8a;
  border-radius: 10px;
  padding: 12px 14px;
  animation: codex-slide-in 0.4s ease;
}
@keyframes codex-slide-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.codex-card--new {
  border: 1px solid var(--color-milestone);
  box-shadow: 0 0 14px rgba(255, 215, 0, 0.35);
}
.codex-card--highlight {
  outline: 2px solid #44ddff;
}
.codex-card--hidden {
  background: rgba(20, 20, 30, 0.6);
  border-left-color: #555;
}
.codex-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.codex-card-icon {
  font-size: 18px;
}
.codex-card-title {
  font-size: 15px;
  font-weight: 700;
  flex: 1;
}
.codex-blur {
  filter: blur(3px);
  user-select: none;
}
.codex-new {
  background: var(--color-milestone);
  color: #1a0d2e;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
}
.codex-lock {
  font-size: 14px;
  opacity: 0.7;
}
.codex-key {
  font-size: 14px;
}
.codex-magnitude {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 6px;
  background: #33dd99;
  color: #063;
}
.codex-real {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 6px;
  border: 1px solid #33dd99;
  color: #33dd99;
}
.codex-card-body {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.7;
  color: #d6cbe8;
}
.codex-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #9d8fc0;
  font-style: italic;
}
.codex-unlock-cond {
  margin-top: 6px;
  font-size: 12px;
  color: #44ddff;
}
.codex-card-foot {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #8c7eb0;
}
.codex-empty {
  text-align: center;
  color: #8c7eb0;
  padding: 30px 0;
  font-size: 13px;
}
</style>
