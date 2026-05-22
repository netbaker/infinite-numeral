<template>
  <div class="progress-bar">
    <div
      class="progress-bar__fill"
      :style="{ width: clampedPercent + '%', backgroundColor: color }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  percent: number;
  color: string;
}>();

const clampedPercent = computed(() => {
  return Math.max(0, Math.min(100, props.percent));
});
</script>

<style scoped>
.progress-bar {
  width: 100%;
  height: 6px;
  background-color: rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
  min-width: 0;
}
</style>
