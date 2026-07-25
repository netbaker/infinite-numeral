<template>
  <div v-if="visible" class="dimension-panel">
    <div class="panel-header">
      <h3>🗐 维度系统</h3>
      <button class="close-btn" @click="emit('close')">✕</button>
    </div>

    <div class="dimension-crystals">
      <span class="crystal-icon">💎</span>
      <span class="crystal-amount">{{ store.dimensionCrystals }}</span>
      <span class="crystal-label">维度晶体</span>
    </div>

    <div class="panel-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'overview' }"
        @click="activeTab = 'overview'"
      >维度总览</button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'synergy' }"
        @click="activeTab = 'synergy'"
      >维度羁绊</button>
    </div>

    <template v-if="activeTab === 'overview'">
      <div class="dimension-list">
      <div
        v-for="dim in panelData"
        :key="dim.id"
        class="dimension-card"
        :class="{
          active: dim.isActive,
          locked: !dim.unlocked,
          [`dim-type-${dim.type}`]: true,
        }"
        @click="onDimensionClick(dim)"
      >
        <div class="dim-header">
          <span class="dim-icon">{{ dim.resourceIcon }}</span>
          <span class="dim-name">{{ dim.name }}</span>
          <span v-if="dim.isActive" class="dim-badge active-badge">当前</span>
          <span v-else-if="!dim.unlocked" class="dim-badge locked-badge">🔒</span>
        </div>

        <div class="dim-desc">{{ dim.description }}</div>

        <div v-if="dim.unlocked" class="dim-stats">
          <div class="stat-row">
            <span class="stat-label">产出倍率：</span>
            <span class="stat-value multiplier-value">{{ dim.multiplier.toFixed(2) }}x</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">精通度：</span>
            <div class="mastery-bar-container">
              <div
                class="mastery-bar"
                :style="{ width: dim.master + '%' }"
              ></div>
              <span class="mastery-text">{{ dim.master.toFixed(1) }}%</span>
            </div>
          </div>
          <div v-if="dim.masterLevel > 0" class="stat-row">
            <span class="stat-label">精通等级：</span>
            <span class="stat-value">Lv.{{ dim.masterLevel }} — {{ dim.masterReward }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">{{ dim.resourceName }}：</span>
            <span class="stat-value">{{ formatDecimal(dim.resource) }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">晶体：</span>
            <span class="stat-value">{{ dim.crystals }} 💎</span>
          </div>
        </div>

        <!-- 精通奖励列表（Sprint 6 Must ②） -->
        <div v-if="dim.unlocked && masteryEffectsByDim[dim.id]" class="dim-mastery-rewards">
          <div class="rewards-title">精通奖励</div>
          <div
            v-for="(eff, idx) in masteryEffectsByDim[dim.id]"
            :key="eff.key"
            class="reward-item"
            :class="{
              'reward-active': activeMastery.has(eff.key),
              'reward-locked': idx >= dim.masterLevel,
            }"
          >
            <span class="reward-level">L{{ idx + 1 }}</span>
            <span class="reward-label">{{ eff.label }}</span>
            <span v-if="activeMastery.has(eff.key)" class="reward-on">✓</span>
          </div>
        </div>

        <div v-if="!dim.unlocked" class="dim-unlock-hint">
          需 {{ dim.unlockCost }} 奇点核心解锁
          <button
            v-if="dim.canUnlock"
            class="btn-unlock"
            @click.stop="onUnlock(dim.id)"
          >
            解锁
          </button>
        </div>

        <div v-if="dim.unlocked && !dim.isActive" class="dim-switch-hint">
          <button class="btn-switch" @click.stop="onSwitch(dim.id)">
            切换至此维度
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeDim" class="dimension-actions">
      <h4>{{ activeDim.resourceIcon }} {{ activeDim.name }} — 操作</h4>
      <button
        class="btn-synthesize"
        :disabled="!canSynthesize"
        @click="onSynthesize"
      >
        💎 合成维度晶体（消耗 1000 {{ activeDim.resourceName }}）
      </button>
      <div v-if="activeDim.type === 'chaos'" class="chaos-info">
        <span>当前混沌倍率：</span>
        <span class="chaos-mult">{{ chaosMultiplier.toFixed(2) }}x</span>
        <span class="chaos-timer">（{{ chaosTimer }}s 后重投）</span>
      </div>
      <div v-if="activeDim.type === 'singularity'" class="singularity-info">
        <span v-if="isBursting">🌟 临界爆发激活中！×100 倍率</span>
        <span v-else>数字接近 e308 时将触发临界爆发。</span>
      </div>
    </div>

    <!-- 维度晶体商店（晶体消费出口） -->
    <div v-if="crystalShop.length > 0" class="crystal-shop">
      <h4>💎 维度晶体商店</h4>
      <!-- Sprint 6b A：累计进度行 + 就近余额（商店区常显，避免滚动脱钩） -->
      <div class="shop-progress">
        <span>已购 {{ purchasedCrystalUpgrades.size }}/{{ crystalShop.length }}</span>
        <span class="shop-balance">💎 {{ store.dimensionCrystals }}</span>
      </div>
      <!-- Sprint 6b A：已购满空态（取代三个灰按钮，避免"满级仍可点"歧义） -->
      <div v-if="purchasedCrystalUpgrades.size >= crystalShop.length" class="shop-all-owned">
        ✅ 维度共鸣已全部激活（永久 +{{ crystalShopMaxBonusPct }}% 全局）
      </div>
      <template v-else>
        <div
          v-for="item in crystalShop"
          :key="item.id"
          class="shop-item"
          :class="{ 'shop-item--owned': purchasedCrystalUpgrades.has(item.id) }"
        >
          <div class="shop-info">
            <span class="shop-name">{{ item.name }}</span>
            <span class="shop-desc">{{ item.description }}</span>
          </div>
          <button
            class="btn-buy-crystal"
            :disabled="!canBuyCrystal(item)"
            :title="crystalTip(item)"
            @click="onBuyCrystal(item.id)"
          >
            <template v-if="purchasedCrystalUpgrades.has(item.id)">已拥有</template>
            <template v-else>💎 {{ item.cost }}</template>
          </button>
        </div>
      </template>
    </div>
    </template>

    <!-- 跨维度协同增益（Sprint 6 Must ③ + Sprint 6b C 知识门控） -->
    <div v-else class="synergy-tab">
      <p class="synergy-intro">
        当一组维度同时达到精通 Lv.{{ SYNERGY_MIN_LEVEL }}（mastery ≥ {{ SYNERGY_MIN_LEVEL * 20 }}）时解锁协同增益。
        全部为机制/规则型，<strong>零乘源、零印记</strong>。
      </p>
      <div
        v-for="syn in synergyList"
        :key="syn.id"
        class="synergy-card"
        :class="{ 'synergy-active': syn.active, 'synergy-niche': syn.niche, 'synergy-gate-locked': syn.gateLocked }"
      >
        <!-- Sprint 6b C①：知识门控未解锁 → 未知羁绊（不泄露 dims/desc） -->
        <template v-if="syn.gateLocked">
          <div class="syn-head">
            <span class="syn-id">🔒</span>
            <span class="syn-name">未知羁绊</span>
          </div>
          <div class="syn-desc">需先发现知识：{{ syn.gateName }}</div>
        </template>
        <template v-else>
          <div class="syn-head">
            <span class="syn-id">{{ syn.id }}</span>
            <span class="syn-name">{{ syn.name }}</span>
            <span v-if="syn.niche" class="syn-niche" title="小众组合">★</span>
            <span v-if="syn.knowledgeGate" class="syn-badge revealed" title="知识揭示">✨ 已揭示</span>
            <span v-if="syn.active" class="syn-badge active">已激活</span>
            <span v-else class="syn-badge locked">未激活</span>
          </div>
          <div class="syn-desc">{{ syn.desc }}</div>
          <!-- Sprint 6b C②：知识 flavor（纯 UI 叙事） -->
          <div v-if="syn.knowledgeFlavor" class="syn-flavor">{{ syn.knowledgeFlavor }}</div>
          <div class="syn-req">
            需求：{{ syn.reqDims.join(' + ') }} 均 ≥ Lv.{{ syn.effMin }}
            <span v-if="syn.easeActive" class="syn-ease">（知识放宽）</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Decimal from 'break_eternity.js';
import { useGameStore } from '@/stores/gameStore';
import {
  DIMENSION_CRYSTAL_SHOP,
  DIMENSION_MASTERY_EFFECTS,
  DIMENSION_SYNERGY_DEFS,
  DIMENSION_DEFS,
  SYNERGY_MIN_LEVEL,
  CRYSTAL_SHOP_MAX_BONUS,
  KNOWLEDGE_ENTRY_DEFS,
} from '@/core/Constants';
import type { DimensionCrystalShopItem } from '@/core/Constants';
import type { DimensionPanelData, DimensionId } from '@/types/game';

const { visible } = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'switch', dimId: DimensionId): void;
  (e: 'unlock', dimId: DimensionId): void;
  (e: 'synthesize'): void;
  (e: 'buy-crystal', itemId: string): void;
}>();

const store = useGameStore();

// 当前标签页（维度总览 / 维度羁绊）
const activeTab = ref<'overview' | 'synergy'>('overview');

// 单权威精通效果表（只读），供模板按 dim.id 取该维度 5 级奖励
const masteryEffectsByDim = DIMENSION_MASTERY_EFFECTS;

// 已激活的精通奖励键集合（依赖 stateVersion 触发重算）
const activeMastery = computed<Set<string>>(() => {
  void store.stateVersion;
  return store.gameState.activeMasteryEffects;
});

// 跨维度协同增益列表（含激活状态 + 需求维度名），依赖 stateVersion 触发重算
const synergyList = computed(() => {
  void store.stateVersion;
  const active = store.gameState.activeSynergies;
  const codex = store.gameState.codexEntries;
  return DIMENSION_SYNERGY_DEFS.map((def) => {
    // Sprint 6b C①：知识门控未解锁 → 隐藏（不泄露 dims/desc）
    const gateUnlocked = def.knowledgeGate ? codex.get(def.knowledgeGate)?.unlocked : true;
    const gateLocked = !!def.knowledgeGate && !gateUnlocked;
    // Sprint 6b C③：知识放宽门槛（仅 S10）激活时有效 minLevel 取 min(minLevel, 2)
    const easeActive = !!def.knowledgeEase && gateUnlocked;
    const effMin = easeActive ? Math.min(def.minLevel, 2) : def.minLevel;
    return {
      ...def,
      active: active.has(def.id),
      reqDims: def.dims.map((d) => DIMENSION_DEFS[d]?.name ?? `Dim-${d}`),
      gateLocked,
      gateName: def.knowledgeGate
        ? (KNOWLEDGE_ENTRY_DEFS.find((k) => k.id === def.knowledgeGate)?.title ?? def.knowledgeGate)
        : '',
      easeActive,
      effMin,
    };
  });
});

const panelData = computed<DimensionPanelData[]>(() =>
  store.getDimensionPanelData()
);

const activeDim = computed(() =>
  panelData.value.find(d => d.isActive) ?? null
);

// 混沌维度：倍率和倒计时（由 gameStore 驱动）
const chaosMultiplier = computed(() => store.chaosMultiplier);
const chaosTimer = computed(() => Math.ceil(store.chaosTimer));

// 奇点维度：临界爆发状态
const isBursting = computed(() => store.isSingularityBursting);

// 维度晶体商店
const crystalShop = DIMENSION_CRYSTAL_SHOP;
// Sprint 6b A：由商品数据派生的永久全局加成上限（= 0.85），供空态展示引用
const crystalShopMaxBonusPct = Math.round(CRYSTAL_SHOP_MAX_BONUS * 100);
const purchasedCrystalUpgrades = computed<Set<string>>(() => {
  void store.stateVersion;
  return store.gameState.purchasedCrystalUpgrades;
});
function canBuyCrystal(item: DimensionCrystalShopItem): boolean {
  void store.stateVersion;
  if (purchasedCrystalUpgrades.value.has(item.id)) return false;
  return store.gameState.dimensionCrystals.gte(item.cost);
}
// Sprint 6b A：不足/hover 提示（已购显示"已拥有"，余额不足显示"晶体不足"）
function crystalTip(item: DimensionCrystalShopItem): string {
  void store.stateVersion;
  if (purchasedCrystalUpgrades.value.has(item.id)) return '已拥有';
  if (!store.gameState.dimensionCrystals.gte(item.cost)) return '晶体不足';
  return '';
}

const canSynthesize = computed(() => {
  if (!activeDim.value) return false;
  const dimState = store.gameState.dimensionStates.get(activeDim.value.id);
  if (!dimState) return false;
  return dimState.resource.gte(1000);
});

function formatDecimal(d: Decimal): string {
  if (d.gte(1e12)) return d.toExponential(4);
  if (d.gte(1000)) return d.toFixed(0);
  if (d.gte(1)) return d.toFixed(2);
  return d.toPrecision(4);
}

function onDimensionClick(_dim: DimensionPanelData) {
  // 点击卡片不触发操作，按钮单独处理
}

function onSwitch(dimId: DimensionId) {
  emit('switch', dimId);
}

function onUnlock(dimId: DimensionId) {
  emit('unlock', dimId);
}

function onSynthesize() {
  emit('synthesize');
}

function onBuyCrystal(itemId: string) {
  emit('buy-crystal', itemId);
}
</script>

<style scoped>
.dimension-panel {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(10, 10, 30, 0.92);
  color: #e0e0ff;
  z-index: 1000;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #333366;
  padding-bottom: 12px;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.4em;
  color: #aaccff;
}

.close-btn {
  background: none;
  border: 1px solid #5555aa;
  color: #aaccff;
  font-size: 1.2em;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
}
.close-btn:hover {
  background: #333366;
}

.dimension-crystals {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface);
  border: 1px solid #4444aa;
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-size: 1.1em;
}

.crystal-icon {
  font-size: 1.4em;
}

.crystal-amount {
  color: #88ddff;
  font-weight: bold;
  font-size: 1.2em;
}

.crystal-label {
  color: #8888bb;
  margin-left: 4px;
}

.dimension-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.dimension-card {
  background: #141428;
  border: 1px solid #333366;
  border-radius: 10px;
  padding: 14px 18px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dimension-card:hover {
  border-color: #5555aa;
}

.dimension-card.active {
  border-color: #6688ff;
  box-shadow: 0 0 12px rgba(100, 130, 255, 0.3);
}

.dimension-card.locked {
  opacity: 0.55;
}

.dim-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.dim-icon {
  font-size: 1.3em;
}

.dim-name {
  font-weight: bold;
  font-size: 1.1em;
  color: #ccccee;
}

.dim-badge {
  font-size: 0.75em;
  padding: 2px 8px;
  border-radius: 10px;
}

.active-badge {
  background: #2233aa;
  color: #aaccff;
}

.locked-badge {
  background: #333;
  color: var(--color-text-dim);
}

.dim-desc {
  font-size: 0.85em;
  color: #8888aa;
  margin-bottom: 8px;
}

.dim-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
}

.stat-label {
  color: #8888aa;
  min-width: 80px;
}

.stat-value {
  color: #bbbbff;
}

.multiplier-value {
  color: #66ffaa;
  font-weight: bold;
}

.mastery-bar-container {
  flex: 1;
  height: 14px;
  background: #1a1a2a;
  border-radius: 7px;
  overflow: hidden;
  position: relative;
}

.mastery-bar {
  height: 100%;
  background: linear-gradient(90deg, #4444aa, #6688ff);
  border-radius: 7px;
  transition: width 0.3s;
}

.mastery-text {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7em;
  color: #ddd;
}

.dim-unlock-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 0.85em;
  color: #8888aa;
}

.btn-unlock {
  background: #2a2a5a;
  border: 1px solid #5555aa;
  color: #aaccff;
  padding: 4px 14px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-unlock:hover {
  background: #3a3a7a;
}

.dim-switch-hint {
  margin-top: 8px;
}

.btn-switch {
  background: #1a2a5a;
  border: 1px solid #4466cc;
  color: #88aaff;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
}
.btn-switch:hover {
  background: #2a3a7a;
}

.dimension-actions {
  background: #141428;
  border: 1px solid #333366;
  border-radius: 10px;
  padding: 16px;
}

.dimension-actions h4 {
  margin: 0 0 12px 0;
  color: #aaccff;
}

.btn-synthesize {
  background: linear-gradient(135deg, #2a2a6a, #3a3a8a);
  border: 1px solid #5555aa;
  color: #ccccee;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  width: 100%;
  font-size: 1em;
  margin-bottom: 10px;
}
.btn-synthesize:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-synthesize:not(:disabled):hover {
  background: linear-gradient(135deg, #3a3a8a, #4a4a9a);
}

.chaos-info,
.singularity-info {
  font-size: 0.9em;
  color: #8888aa;
  padding: 8px;
  background: #1a1a2a;
  border-radius: 6px;
}

.chaos-mult {
  color: var(--color-chaos-accent);
  font-weight: bold;
}

.chaos-timer {
  color: var(--color-text-dim);
  font-size: 0.85em;
}

.crystal-shop {
  background: #141428;
  border: 1px solid #4444aa;
  border-radius: 10px;
  padding: 16px;
}
.crystal-shop h4 {
  margin: 0 0 12px 0;
  color: #88ddff;
}
.shop-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #1a1a2a;
  border: 1px solid #333366;
  border-radius: 8px;
  margin-bottom: 8px;
}
.shop-item:last-child {
  margin-bottom: 0;
}
.shop-item--owned {
  border-color: #44aa66;
  opacity: 0.7;
}
.shop-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shop-name {
  color: #ccccee;
  font-weight: 600;
}
.shop-desc {
  color: #8888aa;
  font-size: 0.82em;
}
.btn-buy-crystal {
  flex-shrink: 0;
  background: linear-gradient(135deg, #2a4a6a, #3a6a8a);
  border: 1px solid #55aacc;
  color: #cceeff;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}
.btn-buy-crystal:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-buy-crystal:not(:disabled):hover {
  background: linear-gradient(135deg, #3a6a8a, #4a8aaa);
}

/* ===== Sprint 6 Must ②③：标签页 / 精通奖励 / 维度羁绊 ===== */
.panel-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.tab-btn {
  flex: 1;
  background: #1a1a2a;
  border: 1px solid #333366;
  color: #8888bb;
  padding: 8px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95em;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.tab-btn.active {
  border-color: var(--color-milestone, #d4af37);
  color: var(--color-milestone, #d4af37);
  background: #221f12;
}
.tab-btn:hover {
  border-color: #5555aa;
}

/* 精通奖励列表 */
.dim-mastery-rewards {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #333366;
}
.rewards-title {
  font-size: 0.8em;
  color: #8888aa;
  margin-bottom: 6px;
}
.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82em;
  padding: 3px 6px;
  border-radius: 6px;
  margin-bottom: 2px;
}
.reward-level {
  color: #6666aa;
  font-size: 0.85em;
  min-width: 22px;
}
.reward-label {
  flex: 1;
  color: #8888aa;
}
.reward-item.reward-active {
  background: rgba(212, 175, 55, 0.12);
}
.reward-item.reward-active .reward-level {
  color: var(--color-milestone, #d4af37);
}
.reward-item.reward-active .reward-label {
  color: #e8d9a0;
}
.reward-on {
  color: #66ffaa;
  font-weight: bold;
}
.reward-item.reward-locked {
  opacity: 0.4;
}

/* 维度羁绊（协同增益） */
.synergy-tab {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.synergy-intro {
  font-size: 0.85em;
  color: #8888aa;
  line-height: 1.5;
  background: #141428;
  border: 1px solid #333366;
  border-radius: 8px;
  padding: 10px 14px;
  margin: 0;
}
.synergy-intro strong {
  color: #66ffaa;
}
.synergy-card {
  background: #141428;
  border: 1px solid #333366;
  border-radius: 10px;
  padding: 12px 16px;
}
.synergy-card.synergy-active {
  border-color: var(--color-milestone, #d4af37);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.25);
}
.synergy-card.synergy-niche {
  border-style: dashed;
}
.syn-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.syn-id {
  font-weight: bold;
  color: #6688ff;
  font-size: 1.05em;
}
.syn-name {
  font-weight: bold;
  color: #ccccee;
  flex: 1;
}
.syn-niche {
  color: var(--color-milestone, #d4af37);
  cursor: help;
}
.syn-badge {
  font-size: 0.72em;
  padding: 2px 8px;
  border-radius: 10px;
}
.syn-badge.active {
  background: #2a5a3a;
  color: #88ffaa;
}
.syn-badge.locked {
  background: #333;
  color: var(--color-text-dim, #8888aa);
}
.syn-desc {
  font-size: 0.85em;
  color: #8888aa;
  margin-bottom: 6px;
}
.syn-req {
  font-size: 0.78em;
  color: #6666aa;
}
.synergy-active .syn-req {
  color: #aaccff;
}

/* ===== Sprint 6b A：晶体商店进度/余额/满购空态 ===== */
.shop-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.85em;
  color: #8888bb;
  background: #1a1a2a;
  border: 1px solid #333366;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 10px;
}
.shop-balance {
  color: #88ddff;
  font-weight: bold;
}
.shop-all-owned {
  text-align: center;
  color: #66ffaa;
  background: rgba(68, 170, 102, 0.12);
  border: 1px solid #44aa66;
  border-radius: 8px;
  padding: 14px 12px;
  font-size: 0.95em;
}

/* ===== Sprint 6b C：知识门控协同展示态 ===== */
.synergy-card.synergy-gate-locked {
  border-style: dashed;
  opacity: 0.6;
}
.syn-badge.revealed {
  background: rgba(212, 175, 55, 0.18);
  color: var(--color-milestone, #d4af37);
}
.syn-flavor {
  font-style: italic;
  font-size: 0.8em;
  color: #aaa9d0;
  border-left: 2px solid rgba(212, 175, 55, 0.4);
  padding-left: 8px;
  margin-bottom: 6px;
}
.syn-ease {
  color: #66ffaa;
  font-weight: bold;
}
</style>
