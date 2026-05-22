<template>
  <Teleport to="body">
    <div v-if="saveStore.showOfflineDialog" class="offline-overlay" @click.self="dismiss">
      <div class="offline-card">
        <h2 class="offline-card__title">离线收益</h2>

        <div class="offline-card__duration">
          <span class="offline-card__label">离线时长</span>
          <span class="offline-card__value">
            {{ saveStore.formatOfflineDuration(offlineDuration) }}
          </span>
        </div>

        <div class="offline-card__gain">
          <span class="offline-card__label">获得数字</span>
          <span class="offline-card__number">+{{ formattedGain }}</span>
        </div>

        <div class="offline-card__efficiency">
          <span class="offline-card__label">效率</span>
          <span class="offline-card__value">{{ efficiencyPercent }}</span>
        </div>

        <button class="offline-card__btn" @click="dismiss">
          领取
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSaveStore } from '@/stores/saveStore';
import { format } from '@/core/Formatter';

const saveStore = useSaveStore();

const offlineDuration = computed(() => {
  return saveStore.offlineResult?.offlineDuration ?? 0;
});

const formattedGain = computed(() => {
  if (!saveStore.offlineResult) return '0';
  return format(saveStore.offlineResult.gainedNumber);
});

const efficiencyPercent = computed(() => {
  if (!saveStore.offlineResult) return '0%';
  return `${Math.round(saveStore.offlineResult.efficiency * 100)}%`;
});

function dismiss(): void {
  saveStore.dismissOfflineDialog();
}
</script>

<style scoped>
.offline-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.2s ease;
}

.offline-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 360px;
  max-width: 90vw;
  padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: slideUp 0.3s ease;
}

.offline-card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-narrative);
  letter-spacing: 4px;
}

.offline-card__duration,
.offline-card__gain,
.offline-card__efficiency {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  width: 100%;
  text-align: center;
}

.offline-card__label {
  font-size: 12px;
  color: var(--color-text-dim);
  letter-spacing: 1px;
}

.offline-card__value {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.offline-card__number {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-growth);
  letter-spacing: 1px;
}

.offline-card__btn {
  width: 100%;
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-growth);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 2px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.offline-card__btn:hover {
  background-color: #43a047;
}

.offline-card__btn:active {
  transform: scale(0.97);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
