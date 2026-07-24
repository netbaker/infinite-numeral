<template>
  <div v-if="visible" class="persona-modal">
    <!-- 标题栏 + 印记计数 -->
    <div class="panel-header">
      <h3>🧬 数字人格</h3>
      <div class="imprint-count">印记: {{ imprints }}/{{ IMPRINT_CAP }} 💠</div>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>

    <!-- 推荐徽标（由 s 向量比较得出，GDD §5 / §2.1） -->
    <div class="recommend-row">
      <span class="recommend-label">推荐</span>
      <span class="recommend-name">{{ recommendedName }}</span>
      <span class="recommend-reason">（基于你的{{ recommendReason }}）</span>
    </div>

    <!-- 三人格选择 -->
    <div class="persona-tabs">
      <button
        v-for="id in PERSONA_IDS"
        :key="id"
        class="persona-tab"
        :class="{
          'persona-tab--active': id === activeId,
          'persona-tab--selected': id === selectedId,
        }"
        @click="selectedId = id"
      >
        <span class="persona-tab__name">{{ meta(id).name }}</span>
        <span class="persona-tab__lv">Lv{{ levelOf(id) }}</span>
        <span v-if="id === recommendedId" class="persona-tab__rec">推荐</span>
      </button>
    </div>

    <!-- 选中人格详情 -->
    <div class="persona-detail">
      <div class="detail-head">
        <span class="detail-name">{{ meta(selectedId).name }}</span>
        <span class="detail-style">{{ meta(selectedId).style }}</span>
      </div>

      <div class="detail-bonus">
        加成:
        <span class="bonus-val">+D(s)={{ dPercent }}%</span>
        <span v-if="saturating" class="bonus-sat">（饱和中）</span>
        <span v-else class="bonus-hint">（激活后生效）</span>
      </div>
      <div class="detail-desc">{{ meta(selectedId).bonusDesc }}</div>

      <div class="detail-actions">
        <button
          class="btn btn-activate"
          :disabled="selectedId === activeId"
          @click="onActivate(selectedId)"
        >{{ selectedId === activeId ? '已激活' : '激活' }}</button>
        <button
          class="btn btn-up"
          :disabled="!canUpgrade(selectedId, 1)"
          @click="onUpgrade()"
        >升至 L1 · {{ PERSONA_L1_COST }}💠</button>
        <button
          class="btn btn-up"
          :disabled="!canUpgrade(selectedId, 2)"
          @click="onUpgrade()"
        >升至 L2 · {{ PERSONA_L2_COST }}💠</button>
      </div>

      <div class="detail-l2">
        <span class="l2-tag">L2</span> {{ meta(selectedId).l2Desc }}
        <span v-if="isL2(selectedId)" class="l2-on">🔓 已生效</span>
      </div>

      <div v-if="selectedId !== activeId" class="switch-warn">
        ⚠ 切换激活人格：旧人格的 L1/L2 会保留，但新人格从 L0 起步，印记不退还，请谨慎。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import * as personaSystem from '@/systems/PersonaSystem';
import { NUMERAL_IMPRINT_CAP, PERSONA_L1_COST, PERSONA_L2_COST } from '@/core/Constants';
import type { PersonaId } from '@/types/game';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const store = useGameStore();

const PERSONA_IDS = personaSystem.PERSONA_IDS;
const IMPRINT_CAP = NUMERAL_IMPRINT_CAP;

const activeId = computed<PersonaId | null>(() => {
  void store.stateVersion;
  return store.gameState.persona.active;
});

// 默认选中：激活 > 推荐 > 首个（打开时同步一次，避免每次 stateVersion 跳回）
const selectedId = ref<PersonaId>('persona_walker');
const initialSelected = computed<PersonaId>(() => {
  void store.stateVersion;
  const a = store.gameState.persona.active;
  if (a) return a;
  return personaSystem.getRecommendedPersona(store.personaVector);
});
watch(
  () => props.visible,
  (v) => {
    if (v) selectedId.value = initialSelected.value;
  },
  { immediate: true },
);

const imprints = computed(() => {
  void store.stateVersion;
  return store.gameState.numeralImprints;
});

const personaVector = computed(() => {
  void store.stateVersion;
  return store.personaVector;
});

// ---- 推荐（由 s 向量比较得出） ----
const recommendedId = computed(() => personaSystem.getRecommendedPersona(personaVector.value));
const recommendedName = computed(() => personaSystem.PERSONA_META[recommendedId.value].name);
const recommendReason = computed(() => {
  const s = personaVector.value;
  const entries: Array<[PersonaId, number, string]> = [
    ['persona_walker', s.walker, '维度广度'],
    ['persona_tamer', s.tamer, '熵控能力'],
    ['persona_chronicler', s.chronicler, '编年深度'],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][2];
});

function meta(id: PersonaId) {
  return personaSystem.PERSONA_META[id];
}
function levelOf(id: PersonaId): 0 | 1 | 2 {
  void store.stateVersion;
  return store.gameState.persona.levels[id];
}
function isL2(id: PersonaId): boolean {
  void store.stateVersion;
  return personaSystem.isActiveL2(store.gameState, id);
}

// ---- D(s) 展示（全局有界，与激活哪个人格无关） ----
const dPercent = computed(() => (personaSystem.computeDPersona(personaVector.value) * 100).toFixed(0));
const saturating = computed(() => personaSystem.computeDepthIndex(personaVector.value) > 0.8);

// ---- 升级可用性：仅对【激活】人格、且当前等级匹配、且印记充足（GDD §5 禁用灰态） ----
function canUpgrade(id: PersonaId, target: 1 | 2): boolean {
  void store.stateVersion;
  if (id !== activeId.value) return false;
  const lvl = store.gameState.persona.levels[id];
  if (lvl !== (target - 1)) return false;
  const cost = target === 1 ? PERSONA_L1_COST : PERSONA_L2_COST;
  return store.gameState.numeralImprints >= cost;
}

function onActivate(id: PersonaId): void {
  if (id === activeId.value) return;
  store.activatePersona(id);
}
function onUpgrade(): void {
  if (!activeId.value) return;
  store.upgradePersona();
}
</script>

<style scoped>
.persona-modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: min(560px, 94vw);
  max-height: 88vh;
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
  display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid var(--color-border-strong);
  padding-bottom: 8px; margin-bottom: 12px;
}
.panel-header h3 { margin: 0; font-size: 18px; color: #ffe082; }
.imprint-count {
  margin-left: auto; font-size: 13px; font-weight: 700;
  color: var(--color-milestone);
}
.close-btn {
  background: none; border: none; color: #ccc; font-size: 18px; cursor: pointer;
}
.close-btn:hover { color: #fff; }

.recommend-row {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  font-size: 13px; margin-bottom: 12px;
  color: var(--color-chaos-accent);
}
.recommend-label {
  background: var(--color-chaos-accent); color: #1a1a1a;
  font-weight: 700; padding: 1px 8px; border-radius: 6px; font-size: 12px;
}
.recommend-name { font-weight: 700; color: #ffd699; }
.recommend-reason { color: #b0bec5; font-size: 12px; }

.persona-tabs {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px;
}
.persona-tab {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border-radius: 8px; cursor: pointer;
  background: rgba(40, 44, 66, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cfd8dc; font-size: 13px;
}
.persona-tab--selected { border-color: rgba(255, 255, 255, 0.45); }
.persona-tab--active { border-color: var(--color-milestone); box-shadow: 0 0 10px rgba(255, 215, 0, 0.25); }
.persona-tab__name { font-weight: 700; }
.persona-tab__lv { font-size: 11px; color: #90a4ae; }
.persona-tab__rec {
  position: absolute; top: -8px; right: -6px;
  background: var(--color-chaos-accent); color: #1a1a1a;
  font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 6px;
}

.persona-detail {
  padding: 14px; border-radius: 10px;
  background: rgba(255, 215, 0, 0.05); border: 1px solid rgba(255, 215, 0, 0.18);
}
.detail-head { display: flex; align-items: baseline; gap: 10px; }
.detail-name { font-size: 16px; font-weight: 700; color: #ffe082; }
.detail-style { font-size: 12px; color: #b0bec5; }
.detail-bonus { margin-top: 8px; font-size: 14px; }
.bonus-val { color: var(--color-milestone); font-weight: 700; }
.bonus-sat { color: var(--color-chaos-accent); font-size: 12px; }
.bonus-hint { color: #90a4ae; font-size: 12px; }
.detail-desc { margin-top: 4px; font-size: 12px; color: #90a4ae; line-height: 1.4; }

.detail-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.btn {
  border: 1px solid var(--color-border-strong); border-radius: 6px;
  padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 600;
  background: var(--color-border); color: #eee;
}
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-activate { background: rgba(255, 215, 0, 0.18); border-color: rgba(255, 215, 0, 0.5); color: #ffe082; }
.btn-up { background: rgba(255, 136, 68, 0.16); border-color: rgba(255, 136, 68, 0.5); color: #ffbb99; }

.detail-l2 {
  margin-top: 12px; font-size: 12px; color: #cfd8dc;
  display: flex; align-items: center; gap: 6px;
}
.l2-tag {
  background: var(--color-chaos-accent); color: #1a1a1a;
  font-weight: 700; padding: 1px 6px; border-radius: 5px; font-size: 11px;
}
.l2-on { color: #69f0ae; }

.switch-warn {
  margin-top: 10px; font-size: 11px; color: var(--color-chaos-accent);
  line-height: 1.5;
}

/* 移动端收口 */
@media (max-width: 767px) {
  .persona-modal { width: 96vw; padding: 12px 14px; }
  .persona-tabs { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .detail-actions { flex-direction: column; }
  .btn { width: 100%; }
}
</style>
