<template>
  <Teleport to="body">
    <transition name="narration-fade">
      <div v-if="gameStore.narrationMessage" class="narration-toast">
        {{ gameStore.narrationMessage }}
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();
</script>

<style scoped>
.narration-toast {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90vw;
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba(76,175,80,0.15), rgba(156,39,176,0.1));
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  color: var(--color-narrative);
  font-size: 14px;
  text-align: center;
  font-style: italic;
  letter-spacing: 1px;
  z-index: 900;
  pointer-events: none;
  text-shadow: 0 0 8px rgba(76,175,80,0.3);
}

.narration-fade-enter-active { animation: narrationIn 0.5s ease; }
.narration-fade-leave-active { animation: narrationOut 0.5s ease; }

@keyframes narrationIn {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes narrationOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to   { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
</style>
