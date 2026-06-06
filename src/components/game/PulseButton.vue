<template>
  <button
    class="pulse-button"
    :class="{ 'pulse-button--crit': isCritAnimating }"
    @click="handleClick"
  >
    <span class="pulse-button__text">脉冲</span>
    <CritEffect v-if="isCritAnimating" />
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { BigNumber } from '@/core/BigNumber';
import { BASE_CLICK_VALUE, CRIT_MULTIPLIER } from '@/core/Constants';
import CritEffect from '@/components/feedback/CritEffect.vue';

const emit = defineEmits<{
  (e: 'click-value', payload: { value: BigNumber; isCrit: boolean; x: number; y: number }): void;
}>();

const gameStore = useGameStore();
const isCritAnimating = ref(false);

function handleClick(event: MouseEvent): void {
  const clickValue = gameStore.pulseClick();

  // 判断是否暴击：如果点击值 >= BASE_CLICK_VALUE * CRIT_MULTIPLIER
  const critThreshold = BigNumber.from(BASE_CLICK_VALUE).mul(CRIT_MULTIPLIER);
  const isCrit = clickValue.gte(critThreshold);

  if (isCrit) {
    isCritAnimating.value = true;
    setTimeout(() => {
      isCritAnimating.value = false;
    }, 400);
  }

  emit('click-value', {
    value: clickValue,
    isCrit,
    x: event.offsetX,
    y: event.offsetY,
  });
}
</script>

<style scoped>
.pulse-button {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #3d2b79, #1a0e3e);
  border: 3px solid var(--color-growth);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.pulse-button:hover {
  box-shadow: 0 0 30px rgba(76, 175, 80, 0.4), inset 0 0 20px rgba(0, 0, 0, 0.3);
  transform: scale(1.05);
}

.pulse-button:active {
  transform: scale(0.95);
}

.pulse-button--crit {
  animation: critPulse 0.4s ease-out;
}

@keyframes critPulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.3);
  }
  50% {
    transform: scale(1.3);
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 215, 0, 0.2);
    border-color: var(--color-milestone);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 20px rgba(76, 175, 80, 0.2), inset 0 0 20px rgba(0, 0, 0, 0.3);
  }
}

.pulse-button__text {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-current);
  letter-spacing: 4px;
  text-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
