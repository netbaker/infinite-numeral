<template>
  <Teleport to="body">
    <transition name="ach-slide">
      <div v-if="gameStore.currentAchievement" class="achievement-toast">
        <span class="achievement-toast__icon">{{ gameStore.currentAchievement.icon }}</span>
        <div class="achievement-toast__body">
          <div class="achievement-toast__label">成就解锁</div>
          <div class="achievement-toast__name">{{ gameStore.currentAchievement.name }}</div>
          <div class="achievement-toast__desc">{{ gameStore.currentAchievement.description }}</div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();
</script>

<style scoped>
.achievement-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px 10px 14px;
  background: linear-gradient(135deg, rgba(20, 20, 30, 0.96), rgba(30, 25, 10, 0.96));
  border: 1px solid rgba(255, 215, 0, 0.5);
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2), 0 0 0 1px rgba(255,215,0,0.1);
  z-index: 1000;
  pointer-events: none;
  max-width: 90vw;
  min-width: 240px;
}

.achievement-toast__icon {
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
}

.achievement-toast__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.achievement-toast__label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #FFD700;
  text-transform: uppercase;
  opacity: 0.8;
}

.achievement-toast__name {
  font-size: 14px;
  font-weight: 700;
  color: #FFE87C;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

.achievement-toast__desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  font-style: italic;
}

/* 从顶部滑入动画 */
.ach-slide-enter-active {
  animation: achSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ach-slide-leave-active {
  animation: achSlideOut 0.35s ease-in;
}

@keyframes achSlideIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.9); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes achSlideOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.95); }
}

@media (max-width: 767px) {
  .achievement-toast { padding: 8px 14px 8px 10px; gap: 8px; min-width: 200px; }
  .achievement-toast__icon { font-size: 22px; }
  .achievement-toast__name { font-size: 13px; }
}
</style>
