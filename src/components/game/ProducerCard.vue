<template>
  <div class="producer-card" :class="{ 'producer-card--locked': !canAfford, 'producer-card--downed': isDowned }">
    <div class="producer-card__header">
      <span class="producer-card__name">{{ config.name }}</span>
      <span class="producer-card__level">Lv.{{ level }}</span>
    </div>
    <div class="producer-card__body">
      <div class="producer-card__output">
        <span class="producer-card__output-label">产出</span>
        <span class="producer-card__output-value">{{ formattedOutput }}/秒</span>
      </div>
      <div class="producer-card__cost">
        <span class="producer-card__cost-label">成本</span>
        <span class="producer-card__cost-value">{{ formattedBulkCost }}</span>
      </div>
    </div>
    <div class="producer-card__action">
      <button class="producer-card__bulk-btn" @click.stop="cycleBulk">
        ×{{ bulkMode === 0 ? 'MAX' : bulkMode }}
      </button>
      <button
        class="producer-card__buy-btn"
        :class="{ 'producer-card__buy-btn--disabled': !canAfford }"
        :disabled="!canAfford"
        @click="handleBuy"
      >购买</button>
    </div>
    <div v-if="isDowned" class="producer-card__downed">⚠ 临界停机中 {{ downRemaining }}s</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { PRODUCER_CONFIGS } from '@/core/Constants';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';

const props = defineProps<{ producerId: string }>();
const gameStore = useGameStore();

const bulkMultipliers = [1, 5, 10, 100, 0]; // 0 = MAX
const bulkMode = ref<number>(1);

/** 在倍数间循环切换：×1 → ×5 → ×10 → ×100 → MAX → ×1 */
function cycleBulk(): void {
  const idx = bulkMultipliers.indexOf(bulkMode.value);
  bulkMode.value = bulkMultipliers[(idx + 1) % bulkMultipliers.length];
}

const config = computed(() => PRODUCER_CONFIGS.find((c) => c.id === props.producerId)!);

const level = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.producers.get(props.producerId)?.level ?? 0;
});

const bulkCost = computed(() => {
  void gameStore.stateVersion;
  const qty = bulkMode.value;
  if (qty === 0) {
    const currentNumber = BigNumber.from(gameStore.gameState.number);
    if (currentNumber.eq(0)) return BigNumber.zero();
    let lo = 0, hi = 10000;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (currentNumber.gte(gameStore.getProducerBulkCost(props.producerId, mid))) lo = mid;
      else hi = mid - 1;
    }
    return gameStore.getProducerBulkCost(props.producerId, lo);
  }
  return gameStore.getProducerBulkCost(props.producerId, qty);
});

const formattedBulkCost = computed(() => format(bulkCost.value));

const formattedOutput = computed(() => {
  const output = BigNumber.from(config.value.baseOutput).mul(level.value);
  return format(output);
});

const canAfford = computed(() => {
  void gameStore.stateVersion;
  return BigNumber.from(gameStore.gameState.number).gte(bulkCost.value);
});

const isDowned = computed(() => {
  void gameStore.stateVersion;
  const until = gameStore.gameState.downedProducers.get(props.producerId);
  return until !== undefined && until > Date.now();
});

const downRemaining = computed(() => {
  void gameStore.stateVersion;
  const until = gameStore.gameState.downedProducers.get(props.producerId);
  if (until === undefined || until <= Date.now()) return 0;
  return Math.ceil((until - Date.now()) / 1000);
});

function handleBuy(): void {
  const qty = bulkMode.value;
  if (qty === 0) {
    const currentNumber = BigNumber.from(gameStore.gameState.number);
    let lo = 0, hi = 10000;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (currentNumber.gte(gameStore.getProducerBulkCost(props.producerId, mid))) lo = mid;
      else hi = mid - 1;
    }
    if (lo > 0) gameStore.buyProducerBulk(props.producerId, lo);
  } else {
    gameStore.buyProducerBulk(props.producerId, qty);
  }
}
</script>

<style scoped>
.producer-card {
  display: flex; flex-direction: column; gap: 3px;
  padding: 5px var(--spacing-xs);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border); border-radius: var(--border-radius);
}
.producer-card:hover { border-color: rgba(76,175,80,0.3); background-color: var(--color-surface-hover); }
.producer-card--locked { opacity: 0.5; }
.producer-card--downed { opacity: 0.45; filter: grayscale(0.85); }
.producer-card__downed {
  font-size: 10px;
  color: var(--color-danger, #ff6b6b);
  font-weight: 600;
  text-align: center;
  margin-top: 2px;
}
.producer-card__header { display: flex; justify-content: space-between; align-items: center; }
.producer-card__name { font-size: 12px; font-weight: 600; color: var(--color-text); }
.producer-card__level { font-size: 10px; color: var(--color-narrative); font-weight: 500; }
.producer-card__body { display: flex; justify-content: space-between; font-size: 11px; gap: 4px; }
.producer-card__output-label { color: var(--color-text-dim); }
.producer-card__output-value { color: var(--color-growth); font-weight: 500; }
.producer-card__cost { display: flex; gap: 3px; }
.producer-card__cost-label { color: var(--color-text-dim); }
.producer-card__cost-value { color: var(--color-cost); font-weight: 500; }
.producer-card__action { display: flex; gap: 4px; align-items: center; }
.producer-card__bulk-btn {
  flex-shrink: 0;
  padding: 2px 7px; font-size: 10px; border-radius: 10px;
  border: 1px solid var(--color-growth); color: var(--color-growth);
  background-color: rgba(76,175,80,0.1); cursor: pointer;
  font-weight: 600; transition: all 0.15s; white-space: nowrap;
}
.producer-card__bulk-btn:hover { background-color: rgba(76,175,80,0.25); }
.producer-card__bulk-btn:active { transform: scale(0.93); }
.producer-card__buy-btn {
  flex: 1;
  padding: 2px 0; border-radius: 3px; background-color: rgba(76,175,80,0.15);
  color: var(--color-growth); font-size: 11px; font-weight: 600; cursor: pointer;
}
.producer-card__buy-btn:hover:not(:disabled) { background-color: rgba(76,175,80,0.3); }
.producer-card__buy-btn--disabled { opacity: 0.4; cursor: not-allowed; }

</style>
