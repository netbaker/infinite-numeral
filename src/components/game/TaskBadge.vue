<template>
  <div
    class="task-badge"
    :class="{ 'task-badge--pulse': unclaimedCount > 0, 'task-badge--hidden': unclaimedCount === 0 }"
    @click="emit('open')"
  >
    <span class="task-badge__icon">⚔️</span>
    <span v-if="unclaimedCount > 0" class="task-badge__count">{{ unclaimedCount }}</span>
  </div>
</template>

<script setup lang="ts">
const { unclaimedCount } = defineProps<{
  unclaimedCount: number;
}>();

const emit = defineEmits<{
  open: [];
}>();
</script>

<style scoped>
.task-badge {
  position: fixed;
  bottom: 70px;
  right: 14px;
  z-index: 800;
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #1a1a2e, #2d2d5e);
  border: 1px solid #6c63ff;
  border-radius: 20px;
  padding: 6px 12px;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(108, 99, 255, 0.3);
  transition: all 0.25s ease;
  color: #e0e0ff;
  font-size: 13px;
  user-select: none;
}
.task-badge:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 18px rgba(108, 99, 255, 0.45);
  border-color: #9b87f5;
}
.task-badge:active { transform: scale(0.96); }

.task-badge--pulse {
  animation: badge-pulse 2s infinite ease-in-out;
}

@keyframes badge-pulse {
  0%, 100% { box-shadow: 0 3px 12px rgba(108, 99, 255, 0.3); }
  50% { box-shadow: 0 4px 20px rgba(108, 99, 255, 0.55), 0 0 30px rgba(108, 99, 255, 0.15); }
}

.task-badge__icon { font-size: 14px; }

.task-badge__count {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  border-radius: 8px;
  padding: 0 4px;
}

/* 无待领取时缩小隐藏 */
.task-badge--hidden {
  opacity: 0.45;
  transform: scale(0.88);
}
.task-badge--hidden:hover {
  opacity: 0.8;
  transform: scale(1);
}

@media (max-width: 767px) {
  .task-badge {
    bottom: 64px;
    right: 10px;
    padding: 5px 10px;
    font-size: 12px;
  }
  .task-badge__icon { font-size: 13px; }
}
</style>
