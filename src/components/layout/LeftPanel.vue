<template>
  <div class="left-panel">
    <h2 class="left-panel__title">生产者</h2>
    <div class="left-panel__list">
      <ProducerCard
        v-for="id in unlockedIds"
        :key="id"
        :producer-id="id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import ProducerCard from '@/components/game/ProducerCard.vue';

const gameStore = useGameStore();

const unlockedIds = computed(() => {
  void gameStore.stateVersion;
  return gameStore.unlockedProducerIds();
});
</script>

<style scoped>
.left-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 140px;
  max-width: 280px;
  flex-shrink: 0;
  padding: var(--spacing-sm);
}

.left-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
  text-align: center;
  letter-spacing: 2px;
  flex-shrink: 0;
}

.left-panel__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

@media (max-width: 1100px) {
  .left-panel { max-width: 200px; min-width: 130px; }
}
@media (max-width: 900px) {
  .left-panel { max-width: 160px; min-width: 110px; }
}
@media (max-height: 700px) {
  .left-panel__title { font-size: 12px; }
}
</style>
