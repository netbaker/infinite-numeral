<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="emit('close')">
        <div class="ach-modal">
          <div class="ach-modal__header">
            <span class="ach-modal__title">🏆 成就</span>
            <span class="ach-modal__progress">{{ unlockedCount }} / {{ total }}</span>
            <button class="ach-modal__close" @click="emit('close')">✕</button>
          </div>

          <!-- 分组展示 -->
          <div class="ach-modal__body">
            <div v-for="group in groups" :key="group.key" class="ach-group">
              <div class="ach-group__title">{{ group.label }}</div>
              <div class="ach-group__list">
                <div
                  v-for="def in group.defs"
                  :key="def.id"
                  class="ach-item"
                  :class="{ 'ach-item--unlocked': isUnlocked(def.id) }"
                >
                  <span class="ach-item__icon">{{ isUnlocked(def.id) ? def.icon : '🔒' }}</span>
                  <div class="ach-item__info">
                    <div class="ach-item__name">{{ def.name }}</div>
                    <div class="ach-item__desc">
                      {{ isUnlocked(def.id) ? def.description : def.hint }}
                    </div>
                    <div v-if="isUnlocked(def.id) && getUnlockedAt(def.id)" class="ach-item__time">
                      {{ formatTime(getUnlockedAt(def.id)!) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { ACHIEVEMENT_DEFS } from '@/core/Constants';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const gameStore = useGameStore();

const GROUP_LABELS: Record<string, string> = {
  growth:      '📈 增长',
  prestige:    '🔄 轮回',
  producer:    '⚙️ 生产者',
  exploration: '🌌 探索',
  legend:      '✨ 传说',
};

const groups = computed(() => {
  const order = ['growth', 'prestige', 'producer', 'exploration', 'legend'];
  return order.map((key) => ({
    key,
    label: GROUP_LABELS[key],
    defs: ACHIEVEMENT_DEFS.filter((d) => d.group === key),
  }));
});

const unlockedCount = computed(() => {
  void gameStore.stateVersion;
  let count = 0;
  for (const def of ACHIEVEMENT_DEFS) {
    if (isUnlocked(def.id)) count++;
  }
  return count;
});

const total = ACHIEVEMENT_DEFS.length;

function isUnlocked(id: string): boolean {
  void gameStore.stateVersion;
  return gameStore.gameState.achievements.get(id)?.unlocked ?? false;
}

function getUnlockedAt(id: string): number | undefined {
  return gameStore.gameState.achievements.get(id)?.unlockedAt;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 500;
}
.ach-modal {
  background: var(--color-surface);
  border: 1px solid rgba(255,215,0,0.2);
  border-radius: 12px;
  width: min(480px, 94vw);
  max-height: 80vh;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.ach-modal__header {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.ach-modal__title { font-size: 16px; font-weight: 700; color: #FFD700; flex: 1; }
.ach-modal__progress { font-size: 12px; color: var(--color-text-dim); }
.ach-modal__close {
  background: none; border: none; color: var(--color-text-dim);
  font-size: 16px; cursor: pointer; padding: 2px 6px; border-radius: 4px;
}
.ach-modal__close:hover { color: var(--color-text); }

.ach-modal__body {
  overflow-y: auto;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 16px;
  -webkit-overflow-scrolling: touch;
}
.ach-group__title {
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  color: var(--color-text-dim); text-transform: uppercase;
  margin-bottom: 8px;
}
.ach-group__list { display: flex; flex-direction: column; gap: 6px; }

.ach-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 10px; border-radius: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  opacity: 0.5; transition: opacity 0.2s;
}
.ach-item--unlocked {
  opacity: 1;
  border-color: rgba(255,215,0,0.2);
  background: rgba(255,215,0,0.04);
}
.ach-item__icon { font-size: 20px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
.ach-item__info { display: flex; flex-direction: column; gap: 2px; }
.ach-item__name { font-size: 13px; font-weight: 600; color: var(--color-text); }
.ach-item--unlocked .ach-item__name { color: #FFE87C; }
.ach-item__desc { font-size: 11px; color: var(--color-text-dim); font-style: italic; }
.ach-item__time { font-size: 10px; color: rgba(255,215,0,0.4); margin-top: 2px; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
