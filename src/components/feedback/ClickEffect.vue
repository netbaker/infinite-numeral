<template>
  <div class="click-effect anim-float-up">
    <span class="click-effect__value" :class="{ 'click-effect__value--crit': isCrit }">
      +{{ formattedValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';

const props = defineProps<{
  value: BigNumber;
  isCrit: boolean;
}>();

const formattedValue = computed(() => {
  return format(props.value);
});
</script>

<style scoped>
.click-effect {
  pointer-events: none;
  white-space: nowrap;
  font-weight: 700;
  font-size: 14px;
  color: var(--color-growth);
}

.click-effect__value--crit {
  font-size: 18px;
  color: var(--color-milestone);
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}
</style>
