<template>
  <div
    class="upgrade-card"
    :class="{ 'upgrade-card--maxed': isMaxed, 'upgrade-card--stardust': isStardust }"
  >
    <div class="upgrade-card__header">
      <span class="upgrade-card__name">{{ def.name }}</span>
      <span class="upgrade-card__level">
        {{ currentLevel }}/{{ def.maxLevel }}
      </span>
    </div>
    <div class="upgrade-card__description">
      {{ def.description }}
    </div>
    <div v-if="!isMaxed" class="upgrade-card__footer">
      <span class="upgrade-card__cost" :class="costClass">
        {{ costLabel }}: {{ formattedCost }}
      </span>
      <button
        class="upgrade-card__buy-btn"
        :class="{ 'upgrade-card__buy-btn--disabled': !canAfford }"
        :disabled="!canAfford"
        @click="handleBuy"
      >
        购买
      </button>
    </div>
    <div v-else class="upgrade-card__maxed-label">已满级</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { UPGRADE_DEFS, STARDUST_UPGRADE_DEFS } from '@/core/Constants';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';

const props = defineProps<{
  upgradeId: string;
  isStardust?: boolean;
}>();

const gameStore = useGameStore();

const isStardust = computed(() => props.isStardust === true);

const def = computed(() => {
  if (isStardust.value) {
    return STARDUST_UPGRADE_DEFS.find((d) => d.id === props.upgradeId)!;
  }
  return UPGRADE_DEFS.find((d) => d.id === props.upgradeId)!;
});

const currentLevel = computed(() => {
  void gameStore.stateVersion;
  const state = gameStore.gameState;
  if (isStardust.value) {
    const sdState = state.stardustUpgrades.get(props.upgradeId);
    return sdState?.level ?? 0;
  }
  const upgradeState = state.upgrades.get(props.upgradeId);
  return upgradeState?.level ?? 0;
});

const isMaxed = computed(() => {
  return currentLevel.value >= def.value.maxLevel;
});

const upgradeCost = computed(() => {
  void gameStore.stateVersion;
  if (isStardust.value) {
    return gameStore.getStardustUpgradeCost(props.upgradeId);
  }
  return gameStore.getUpgradeCost(props.upgradeId);
});

const formattedCost = computed(() => {
  if (isStardust.value) {
    const cost = upgradeCost.value as number;
    if (cost >= 1e6) {
      return cost.toExponential(2);
    }
    return cost.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
  return format(upgradeCost.value as BigNumber);
});

const costLabel = computed(() => {
  return isStardust.value ? '星尘' : '成本';
});

const costClass = computed(() => {
  return isStardust.value ? 'upgrade-card__cost--stardust' : 'upgrade-card__cost--number';
});

const canAfford = computed(() => {
  void gameStore.stateVersion;
  if (isMaxed.value) return false;
  if (isStardust.value) {
    return gameStore.gameState.stardust >= (upgradeCost.value as number);
  }
  const currentNumber = BigNumber.from(gameStore.gameState.number);
  return currentNumber.gte(upgradeCost.value as BigNumber);
});

function handleBuy(): void {
  if (isStardust.value) {
    gameStore.buyStardustUpgrade(props.upgradeId);
  } else {
    gameStore.buyUpgrade(props.upgradeId);
  }
}
</script>

<style scoped>
.upgrade-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.upgrade-card:hover {
  border-color: rgba(255, 215, 0, 0.2);
  background-color: var(--color-surface-hover);
}

.upgrade-card--stardust {
  border-color: rgba(156, 39, 176, 0.15);
}

.upgrade-card--stardust:hover {
  border-color: rgba(156, 39, 176, 0.3);
}

.upgrade-card--maxed {
  opacity: 0.5;
}

.upgrade-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upgrade-card__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.upgrade-card__level {
  font-size: 11px;
  color: var(--color-narrative);
  font-weight: 500;
}

.upgrade-card__description {
  font-size: 11px;
  color: var(--color-text-dim);
  line-height: 1.4;
}

.upgrade-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
}

.upgrade-card__cost {
  font-size: 11px;
  font-weight: 500;
}

.upgrade-card__cost--number {
  color: var(--color-cost);
}

.upgrade-card__cost--stardust {
  color: var(--color-prestige);
}

.upgrade-card__buy-btn {
  padding: 2px 10px;
  border-radius: 4px;
  background-color: rgba(255, 215, 0, 0.1);
  color: var(--color-milestone);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.upgrade-card__buy-btn:hover:not(:disabled) {
  background-color: rgba(255, 215, 0, 0.25);
}

.upgrade-card__buy-btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.upgrade-card__maxed-label {
  font-size: 11px;
  color: var(--color-growth);
  text-align: center;
  font-weight: 600;
}
</style>
