<template>
  <div>
    <button class="prestige-button" @click="showConfirm = true">
      <div class="prestige-button__title">坍缩</div>
      <div class="prestige-button__gain">
        获得 ✦ {{ stardustGain }} 星尘
      </div>
      <div class="prestige-button__hint">
        重置数字与升级，保留星尘升级
      </div>
    </button>
    <PrestigeConfirmModal
      :visible="showConfirm"
      :stardust-gain="stardustGain"
      @confirm="handleConfirm"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import PrestigeConfirmModal from '@/components/modals/PrestigeConfirmModal.vue';

const gameStore = useGameStore();
const showConfirm = ref(false);

const stardustGain = computed(() => {
  void gameStore.stateVersion;
  return gameStore.prestigeGain();
});

function handleConfirm(): void {
  gameStore.executePrestige();
  showConfirm.value = false;
}
</script>

<style scoped>
.prestige-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.2), rgba(156, 39, 176, 0.05));
  border: 2px solid var(--color-prestige);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.prestige-button:hover {
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.35), rgba(156, 39, 176, 0.1));
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.3);
}

.prestige-button__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-prestige);
  letter-spacing: 4px;
}

.prestige-button__gain {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-milestone);
}

.prestige-button__hint {
  font-size: 11px;
  color: var(--color-text-dim);
}
</style>
