<script setup lang="ts">
import { useGameStore } from '@/stores/gameStore';
import { CODEX_CATEGORY_META, type CodexCategory } from '@/types/codex';

const store = useGameStore();

function onClick(entryId: string): void {
  store.openCodex(entryId);
}
</script>

<template>
  <div class="codex-toast-stack">
    <transition-group name="codex-toast">
      <div
        v-for="note in store.codexNotifications"
        :key="note.key"
        class="codex-toast"
        :style="{ borderLeftColor: CODEX_CATEGORY_META[note.category as CodexCategory]?.color || '#ffd700' }"
        @click="onClick(note.entryId)"
      >
        <div class="codex-toast-title">📖 图鉴更新</div>
        <div class="codex-toast-body">「{{ note.title }}」</div>
        <div class="codex-toast-sub">已收录至 {{ CODEX_CATEGORY_META[note.category as CodexCategory]?.label || '图鉴' }}</div>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.codex-toast-stack {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.codex-toast {
  pointer-events: auto;
  cursor: pointer;
  width: 240px;
  padding: 10px 12px;
  border-radius: 10px;
  border-left: 4px solid var(--color-milestone);
  background: rgba(26, 13, 46, 0.95);
  color: #ece6f5;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
  font-family: 'Noto Sans SC', system-ui, sans-serif;
  animation: codex-toast-in 0.3s ease;
}
.codex-toast:hover {
  filter: brightness(1.15);
}
.codex-toast-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-milestone);
}
.codex-toast-body {
  font-size: 14px;
  margin: 2px 0;
}
.codex-toast-sub {
  font-size: 11px;
  color: #b9a9d6;
}
@keyframes codex-toast-in {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.codex-toast-leave-active {
  transition: all 0.3s ease;
}
.codex-toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
