<template>
  <div class="number-display">
    <div class="number-display__current">
      {{ gameStore.displayNumber }}
    </div>
    <div class="number-display__per-sec">
      +{{ gameStore.displayOutputPerSec }}/秒
    </div>
    <div class="number-display__total">
      总计 {{ gameStore.displayTotalNumber }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();
</script>

<style scoped>
.number-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.number-display__current {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-current);
  letter-spacing: 2px;
  text-shadow: 0 0 12px rgba(255, 255, 255, 0.15);
  min-height: 40px;
}

.number-display__per-sec {
  font-size: 14px;
  color: var(--color-growth);
  font-weight: 500;
}

.number-display__total {
  font-size: 12px;
  color: var(--color-text-dim);
}
</style>
