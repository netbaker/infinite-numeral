<template>
  <div class="right-panel">
    <h2 class="right-panel__title">升级</h2>

    <!-- 常规升级 -->
    <div class="right-panel__section">
      <h3 class="right-panel__section-title">常规升级</h3>
      <div class="right-panel__list">
        <UpgradeCard
          v-for="id in upgradeIds"
          :key="id"
          :upgrade-id="id"
        />
      </div>
    </div>

    <!-- 科技树 -->
    <div class="right-panel__section right-panel__section--tech">
      <h3 class="right-panel__section-title right-panel__section-title--tech">
        科技树
      </h3>
      <TechTreeGraph />
    </div>

    <!-- 星尘升级 -->
    <div v-if="prestigeCount > 0" class="right-panel__section">
      <h3 class="right-panel__section-title right-panel__section-title--stardust">
        星尘升级
        <span class="right-panel__res-count">✦ {{ stardustAmount }}</span>
      </h3>
      <div class="right-panel__list">
        <UpgradeCard
          v-for="id in stardustUpgradeIds"
          :key="'sd-' + id"
          :upgrade-id="id"
          :is-stardust="true"
        />
      </div>
    </div>

    <!-- 暗能量升级 -->
    <div v-if="expansionCount > 0" class="right-panel__section">
      <h3 class="right-panel__section-title right-panel__section-title--expansion">
        暗能量升级
        <span class="right-panel__res-count">◉ {{ darkEnergyAmount }}</span>
      </h3>
      <div class="right-panel__list right-panel__list--compact">
        <div
          v-for="def in expansionDefs"
          :key="'ex-' + def.id"
          class="upgrade-mini"
        >
          <div class="upgrade-mini__name">{{ def.name }}</div>
          <div class="upgrade-mini__desc">{{ def.description }}</div>
          <div class="upgrade-mini__footer">
            <span class="upgrade-mini__cost">◉ {{ getExCost(def.id) }}</span>
            <span class="upgrade-mini__level">{{ getExLevel(def.id) }}/{{ def.maxLevel }}</span>
            <button
              class="upgrade-mini__btn"
              :disabled="!canBuyEx(def.id)"
              @click="handleBuyEx(def.id)"
            >买</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 超越升级（元升级） -->
    <div v-if="transcendCount > 0" class="right-panel__section">
      <h3 class="right-panel__section-title right-panel__section-title--transcend">
        元升级
        <span class="right-panel__res-count">◆ {{ singularityAmount }}</span>
      </h3>
      <div class="right-panel__list right-panel__list--compact">
        <div
          v-for="def in transcendDefs"
          :key="'tc-' + def.id"
          class="upgrade-mini upgrade-mini--gold"
        >
          <div class="upgrade-mini__name">{{ def.name }}</div>
          <div class="upgrade-mini__desc">{{ def.description }}</div>
          <div class="upgrade-mini__footer">
            <span class="upgrade-mini__cost">◆ {{ getTcCost(def.id) }}</span>
            <span class="upgrade-mini__level">{{ getTcLevel(def.id) }}/{{ def.maxLevel }}</span>
            <button
              class="upgrade-mini__btn upgrade-mini__btn--gold"
              :disabled="!canBuyTc(def.id)"
              @click="handleBuyTc(def.id)"
            >买</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { EXPANSION_UPGRADE_DEFS, TRANSCEND_UPGRADE_DEFS } from '@/core/Constants';
import UpgradeCard from '@/components/game/UpgradeCard.vue';
import TechTreeGraph from '@/components/game/TechTreeGraph.vue';

const gameStore = useGameStore();

const upgradeIds = computed(() => {
  void gameStore.stateVersion;
  return gameStore.availableUpgradeIds();
});

const stardustUpgradeIds = computed(() => {
  void gameStore.stateVersion;
  return gameStore.availableStardustUpgradeIds();
});

const prestigeCount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.prestigeCount;
});

const stardustAmount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.stardust;
});

const darkEnergyAmount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.darkEnergy;
});

const expansionCount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.expansionCount;
});

const expansionDefs = computed(() => EXPANSION_UPGRADE_DEFS);

function getExCost(id: string): number {
  void gameStore.stateVersion;
  return gameStore.getExpansionUpgradeCost(id);
}
function getExLevel(id: string): number {
  void gameStore.stateVersion;
  return gameStore.gameState.expansionUpgrades.get(id)?.level ?? 0;
}
function canBuyEx(id: string): boolean {
  void gameStore.stateVersion;
  const state = gameStore.gameState;
  const def = EXPANSION_UPGRADE_DEFS.find(d => d.id === id);
  if (!def) return false;
  const exState = state.expansionUpgrades.get(id);
  if (!exState || exState.level >= def.maxLevel) return false;
  const cost = def.deCost * Math.pow(def.costScaling, exState.level);
  return state.darkEnergy >= cost;
}
function handleBuyEx(id: string): void {
  gameStore.buyExpansionUpgrade(id);
}

const transcendCount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.transcendCount;
});
const singularityAmount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.singularity;
});
const transcendDefs = computed(() => TRANSCEND_UPGRADE_DEFS);

function getTcCost(id: string): number {
  void gameStore.stateVersion;
  return gameStore.getTranscendUpgradeCost(id);
}
function getTcLevel(id: string): number {
  void gameStore.stateVersion;
  return gameStore.gameState.transcendUpgrades.get(id)?.level ?? 0;
}
function canBuyTc(id: string): boolean {
  void gameStore.stateVersion;
  const state = gameStore.gameState;
  const def = TRANSCEND_UPGRADE_DEFS.find(d => d.id === id);
  if (!def) return false;
  const tcState = state.transcendUpgrades.get(id);
  if (!tcState || tcState.level >= def.maxLevel) return false;
  const cost = def.singularityCost * Math.pow(def.costScaling, tcState.level);
  return state.singularity >= cost;
}
function handleBuyTc(id: string): void {
  gameStore.buyTranscendUpgrade(id);
}
</script>

<style scoped>
.right-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 140px;
  max-width: 280px;
  flex-shrink: 0;
  padding: var(--spacing-sm);
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}
.right-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  text-align: center;
  letter-spacing: 2px;
  flex-shrink: 0;
}
.right-panel__section { margin-bottom: var(--spacing-sm); flex-shrink: 0; }
.right-panel__section--tech { flex-shrink: 1; }

.right-panel__section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-dim);
  margin-bottom: var(--spacing-xs);
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
}
.right-panel__section-title--stardust {
  color: #ce93d8;
  border-bottom-color: rgba(156, 39, 176, 0.3);
}
.right-panel__section-title--tech { color: #4dd0e1; border-bottom-color: rgba(0,188,212,0.25); }
.right-panel__section-title--expansion { color: #4dd0e1; border-bottom-color: rgba(0,188,212,0.25); }
.right-panel__section-title--transcend { color: #ffd54f; border-bottom-color: rgba(255,215,0,0.25); }

.right-panel__res-count { font-size: 11px; opacity: 0.85; }
.right-panel__list { display: flex; flex-direction: column; gap: var(--spacing-xs); }
.right-panel__list--compact { gap: 4px; }

/* ---- 紧凑升级卡片（暗能量/元升级） ---- */
.upgrade-mini {
  padding: 5px 8px;
  border: 1px solid rgba(0,188,212,0.12);
  border-radius: var(--border-radius, 4px);
  background: var(--color-surface);
}
.upgrade-mini--gold { border-color: rgba(255,215,0,0.12); }
.upgrade-mini__name { font-size: 11px; font-weight: 600; color: #4dd0e1; margin-bottom: 1px; }
.upgrade-mini--gold .upgrade-mini__name { color: #ffd54f; }
.upgrade-mini__desc { font-size: 10px; color: var(--color-text-dim); margin-bottom: 3px; line-height: 1.3; }
.upgrade-mini__footer { display: flex; align-items: center; gap: 4px; }
.upgrade-mini__cost { font-size: 10px; color: #4dd0e1; font-weight: 500; }
.upgrade-mini--gold .upgrade-mini__cost { color: #ffd54f; }
.upgrade-mini__level { font-size: 10px; color: var(--color-text-dim); flex: 1; }
.upgrade-mini__btn {
  padding: 1px 10px; border-radius: 3px; border: none; cursor: pointer;
  background: rgba(0,188,212,0.18); color: #4dd0e1; font-size: 10px;
}
.upgrade-mini__btn:hover:not(:disabled) { background: rgba(0,188,212,0.32); }
.upgrade-mini__btn:disabled { opacity: 0.35; cursor: not-allowed; }
.upgrade-mini__btn--gold { background: rgba(255,215,0,0.15); color: #ffd54f; }
.upgrade-mini__btn--gold:hover:not(:disabled) { background: rgba(255,215,0,0.28); }

/* ---- 响应式断点 ---- */
@media (max-width: 1100px) {
  .right-panel { max-width: 200px; min-width: 130px; }
  .right-panel__title { font-size: 13px; }
  .right-panel__section-title { font-size: 11px; }
}
@media (max-width: 900px) {
  .right-panel { max-width: 160px; min-width: 110px; }
  .right-panel__title { font-size: 12px; }
}
@media (max-height: 700px) {
  .right-panel__title { font-size: 12px; }
  .right-panel__section-title { font-size: 11px; }
}
/* 移动端全屏面板 */
@media (max-width: 767px) {
  .right-panel {
    max-width: 100%;
    min-width: 0;
    width: 100%;
    padding: 6px 8px;
    height: 100%;
  }
  .right-panel__section { margin-bottom: 8px; }
  .right-panel__title { font-size: 13px; margin-bottom: 4px; }
}
</style>
