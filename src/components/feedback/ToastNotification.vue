<template>
  <Transition name="toast-fade">
    <div v-if="visible" class="toast-notification" :class="typeClass">
      <span class="toast-notification__message">{{ message }}</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps<{
  message: string;
  type?: 'info' | 'success' | 'warning';
  duration?: number;
}>();

const visible = ref(true);

const typeClass = computed(() => {
  return `toast-notification--${props.type ?? 'info'}`;
});

onMounted(() => {
  const duration = props.duration ?? 3000;
  setTimeout(() => {
    visible.value = false;
  }, duration);
});
</script>

<style scoped>
.toast-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius);
  font-size: 13px;
  font-weight: 500;
  z-index: 1000;
  pointer-events: none;
  max-width: 400px;
  text-align: center;
}

.toast-notification--info {
  background-color: rgba(var(--color-tech-accent-rgb), 0.15);
  border: 1px solid rgba(var(--color-tech-accent-rgb), 0.3);
  color: var(--color-narrative);
}

.toast-notification--success {
  background-color: rgba(76, 175, 80, 0.15);
  border: 1px solid rgba(76, 175, 80, 0.3);
  color: var(--color-growth);
}

.toast-notification--warning {
  background-color: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
  color: var(--color-milestone);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
