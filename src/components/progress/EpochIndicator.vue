<template>
  <div class="epoch-indicator">
    <div class="epoch-indicator__name">
      {{ currentEpochName }}
    </div>
    <div class="epoch-indicator__narrative">
      {{ currentEpochNarrative }}
    </div>
    <ProgressBar
      :percent="progressPercent"
      :color="'var(--color-milestone)'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { EPOCH_CONFIGS } from '@/core/Constants';
import ProgressBar from '@/components/progress/ProgressBar.vue';

const gameStore = useGameStore();

const currentEpochName = computed(() => {
  void gameStore.stateVersion;
  const epoch = EPOCH_CONFIGS.find((e) => e.id === gameStore.gameState.currentEpoch);
  return epoch ? epoch.name : '未知';
});

const currentEpochNarrative = computed(() => {
  void gameStore.stateVersion;
  const epoch = EPOCH_CONFIGS.find((e) => e.id === gameStore.gameState.currentEpoch);
  return epoch ? epoch.narrative : '';
});

const progressPercent = computed(() => {
  void gameStore.stateVersion;
  const progress = gameStore.epochProgress();
  return progress.percent;
});
</script>

<style scoped>
.epoch-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  width: 100%;
  max-width: 300px;
}

.epoch-indicator__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-narrative);
  letter-spacing: 2px;
}

.epoch-indicator__narrative {
  font-size: 12px;
  color: var(--color-text-dim);
  text-align: center;
  font-style: italic;
  line-height: 1.4;
}
</style>
