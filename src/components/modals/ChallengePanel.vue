<template>
  <Teleport to="body">
    <div v-if="visible" class="ch-overlay" @click.self="emit('close')">
      <div class="ch-panel">
        <!-- 标题栏 -->
        <div class="ch-panel__header">
          <h2 class="ch-panel__title">⚔️ 挑战任务</h2>
          <button class="ch-panel__close" @click="emit('close')">✕</button>
        </div>

        <!-- 每日统计 -->
        <div class="ch-panel__stats">
          <span class="ch-panel__stat">
            📋 今日 {{ dailyStats.completed }}/{{ dailyStats.total }}
          </span>
          <span v-if="unclaimedCount > 0" class="ch-panel__stat ch-panel__stat--reward">
            🎁 {{ unclaimedCount }} 份奖励待领取
          </span>
        </div>

        <!-- Tab 切换 -->
        <div class="ch-panel__tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="ch-panel__tab"
            :class="{ 'ch-panel__tab--active': activeTab === tab.key }"
            @click="activeTab = tab.key"
          >{{ tab.icon }} {{ tab.label }}</button>
        </div>

        <!-- 内容区域 -->
        <div class="ch-panel__body">
          <!-- 每日任务 -->
          <template v-if="activeTab === 'daily'">
            <div
              v-for="item in dailyChallenges"
              :key="item.def.id + '-' + dataVersion"
              class="ch-item"
              :class="{ 'ch-item--done': item.state.completed, 'ch-item--claimed': item.state.claimed }"
            >
              <div class="ch-item__header">
                <span class="ch-item__icon">{{ item.def.icon }}</span>
                <span class="ch-item__name">{{ item.def.name }}</span>
                <span class="ch-item__reward">✨ +{{ item.def.stardustReward }}</span>
              </div>
              <p class="ch-item__desc">{{ item.def.description }}</p>
              <div class="ch-item__progress">
                <div class="ch-item__bar">
                  <div class="ch-item__bar-fill" :style="{ width: item.progressPercent + '%' }" />
                </div>
                <span class="ch-item__pct">{{ formatProgress(item) }}</span>
              </div>
              <button
                v-if="item.state.completed && !item.state.claimed"
                class="ch-item__claim"
                @click="emit('claim', item.def.id)"
              >领取奖励</button>
              <span v-else-if="item.state.claimed" class="ch-item__claimed-tag">已领取 ✓</span>
            </div>
            <div v-if="dailyChallenges.length === 0" class="ch-empty">暂无每日任务</div>
          </template>

          <!-- 限时挑战 -->
          <template v-if="activeTab === 'timed'">
            <div
              v-for="item in timedChallenges"
              :key="item.def.id + '-' + dataVersion"
              class="ch-item ch-item--timed"
              :class="{
                'ch-item--done': item.state.completed,
                'ch-item--active': item.isActive,
                'ch-item--expired': item.isExpired,
              }"
            >
              <div class="ch-item__header">
                <span class="ch-item__icon">{{ item.def.icon }}</span>
                <span class="ch-item__name">{{ item.def.name }}</span>
                <span class="ch-item__timer" :class="{ 'ch-item__timer--run': item.isActive }">
                  {{ item.remainingFormat || formatTime(item.def.timeLimit) }}
                </span>
              </div>
              <p class="ch-item__desc">{{ item.def.description }}</p>
              <div v-if="item.isActive" class="ch-item__progress">
                <div class="ch-item__bar ch-item__bar--pulse">
                  <div class="ch-item__bar-fill ch-item__bar-fill--timed" :style="{ width: item.progressPercent + '%' }" />
                </div>
                <span class="ch-item__pct">{{ Math.floor(item.progressPercent) }}%</span>
              </div>
              <button
                v-if="item.canStart && !item.state.completed"
                class="ch-item__start"
                @click="emit('startTimed', item.def.id)"
              >⚡ 开始挑战</button>
              <span v-else-if="item.isExpired" class="ch-item__expired-tag">已超时</span>
              <span v-else-if="item.state.completed" class="ch-item__claimed-tag">完成! ✓</span>
              <button
                v-if="item.state.completed && !item.state.claimed"
                class="ch-item__claim"
                @click="emit('claim', item.def.id)"
              >领取 +{{ item.def.stardustReward }} ✨</button>
            </div>
            <div v-if="timedChallenges.length === 0" class="ch-empty">暂无可用挑战</div>
          </template>

          <!-- 里程碑 -->
          <template v-if="activeTab === 'milestone'">
            <div
              v-for="item in milestoneChallenges"
              :key="item.def.id + '-' + dataVersion"
              class="ch-item ch-item--milestone"
              :class="{ 'ch-item--done': item.state.completed, 'ch-item--claimed': item.state.claimed }"
            >
              <div class="ch-item__header">
                <span class="ch-item__icon">{{ item.def.icon }}</span>
                <span class="ch-item__name">{{ item.def.name }}</span>
              </div>
              <p class="ch-item__desc">{{ item.def.description }}</p>
              <div class="ch-item__progress">
                <div class="ch-item__bar">
                  <div class="ch-item__bar-fill ch-item__bar-fill--ms" :style="{ width: item.progressPercent + '%' }" />
                </div>
                <span class="ch-item__pct">{{ formatProgress(item) }}</span>
              </div>
              <div v-if="item.def.deReward" class="ch-item__rewards">
                <span>✨ {{ item.def.stardustReward }}</span>
                <span>🌑 {{ item.def.deReward }}</span>
              </div>
              <button
                v-if="item.state.completed && !item.state.claimed"
                class="ch-item__claim ch-item__claim--ms"
                @click="emit('claim', item.def.id)"
              >领取里程碑奖励</button>
              <span v-else-if="item.state.claimed" class="ch-item__claimed-tag">🏆 已达成</span>
            </div>
            <div v-if="milestoneChallenges.length === 0" class="ch-empty">暂无里程碑</div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import type { ChallengeCategory } from '@/types/game';

const gameStore = useGameStore();

defineProps<{
  visible: boolean;
  dailyChallenges: Array<{
    def: { id: string; icon: string; name: string; description: string; stardustReward: number; targetValue: number; progressType: string };
    state: { completed: boolean; claimed: boolean; progress: number };
    progressPercent: number;
  }>;
  timedChallenges: Array<{
    def: { id: string; icon: string; name: string; description: string; stardustReward: number; targetValue: number; timeLimit: number };
    state: { completed: boolean; claimed: boolean; progress: number };
    progressPercent: number;
    isActive: boolean;
    isExpired: boolean;
    canStart: boolean;
    remainingFormat: string;
  }>;
  milestoneChallenges: Array<{
    def: { id: string; icon: string; name: string; description: string; stardustReward: number; deReward?: number; targetValue: number };
    state: { completed: boolean; claimed: boolean; progress: number };
    progressPercent: number;
  }>;
  dailyStats: { total: number; completed: number; claimed: number };
  unclaimedCount: number;
}>();

const emit = defineEmits<{
  close: [];
  claim: [id: string];
  startTimed: [id: string];
}>();

const activeTab = ref<ChallengeCategory>('daily');

const tabs = [
  { key: 'daily' as const, label: '每日', icon: '📋' },
  { key: 'timed' as const, label: '挑战', icon: '⚡' },
  { key: 'milestone' as const, label: '里程碑', icon: '🏆' },
];

/* 强制刷新：stateVersion 变化时递增，驱动 v-for 重新渲染 */
const dataVersion = ref(0);
watch(() => gameStore.stateVersion, () => { dataVersion.value++; });

function formatProgress(item: { def: { targetValue: number; progressType?: string }; state: { progress: number } }): string {
  const pt = item.def.progressType || 'number_reach';
  if (pt === 'number_reach') {
    return formatNum(item.state.progress) + ' / ' + formatNum(item.def.targetValue);
  }
  return `${Math.floor(item.state.progress)} / ${item.def.targetValue}`;
}

function formatNum(n: number): string {
  if (n >= 1e6) return n.toExponential(2);
  if (n >= 1000) return Math.floor(n).toLocaleString();
  return Math.floor(n).toString();
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
</script>

<style scoped>
.ch-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.ch-panel {
  background: var(--color-surface);
  border: 1px solid #3a3a5e;
  border-radius: 14px;
  width: 92vw;
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  color: #e0e0ff;
  overflow: hidden;
}
.ch-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #2a2a4e;
  flex-shrink: 0;
}
.ch-panel__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.ch-panel__close {
  background: none;
  border: none;
  color: #8888aa;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.ch-panel__close:hover { background: #2a2a4e; color: #fff; }

.ch-panel__stats {
  display: flex;
  gap: 10px;
  padding: 8px 16px;
  flex-shrink: 0;
}
.ch-panel__stat {
  font-size: 12px;
  color: #9999bb;
  background: #12122a;
  padding: 3px 10px;
  border-radius: 10px;
}
.ch-panel__stat--reward { color: var(--color-milestone); }

.ch-panel__tabs {
  display: flex;
  gap: 0;
  padding: 0 16px;
  border-bottom: 1px solid #2a2a4e;
  flex-shrink: 0;
}
.ch-panel__tab {
  flex: 1;
  background: none;
  border: none;
  color: #7777aa;
  padding: 8px 0;
  font-size: 13px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.ch-panel__tab--active {
  color: #e0e0ff;
  border-bottom-color: #6c63ff;
}
.ch-panel__tab:hover:not(.ch-panel__tab--active) { color: #aaaacc; }

.ch-panel__body {
  overflow-y: auto;
  padding: 10px 16px 16px;
  flex: 1;
}
.ch-panel__body::-webkit-scrollbar { width: 4px; }
.ch-panel__body::-webkit-scrollbar-thumb { background: #3a3a5e; border-radius: 2px; }

/* ---- 挑战条目 ---- */
.ch-item {
  background: #12122a;
  border: 1px solid #222244;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}
.ch-item:hover { border-color: #3a3a6e; }
.ch-item--done { border-left: 3px solid #4ade80; }
.ch-item--claimed { opacity: 0.65; }
.ch-item--active { border-left: 3px solid #f59e0b; box-shadow: 0 0 8px rgba(245, 158, 11, 0.15); }
.ch-item--expired { border-left: 3px solid #ef4444; opacity: 0.7; }
.ch-item--milestone { border-left: 3px solid #a78bfa; }

.ch-item__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.ch-item__icon { font-size: 16px; }
.ch-item__name { font-weight: 600; font-size: 13px; flex: 1; }
.ch-item__reward { font-size: 11px; color: var(--color-milestone); }
.ch-item__timer { font-size: 11px; color: var(--color-text-dim); font-variant-numeric: tabular-nums; }
.ch-item__timer--run { color: #f59e0b; font-weight: 600; animation: pulse-timer 1s infinite; }

@keyframes pulse-timer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.ch-item__desc { font-size: 11px; color: #8888aa; margin: 2px 0 6px; }

.ch-item__progress { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ch-item__bar { flex: 1; height: 6px; background: #222244; border-radius: 3px; overflow: hidden; }
.ch-item__bar-fill { height: 100%; background: linear-gradient(90deg, #6c63ff, #9b87f5); border-radius: 3px; transition: width 0.3s; }
.ch-item__bar-fill--timed { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.ch-item__bar-fill--ms { background: linear-gradient(90deg, #a78bfa, #c4b5fd); }
.ch-item__bar--pulse .ch-item__bar-fill { animation: bar-glow 1.5s infinite ease-in-out; }

@keyframes bar-glow {
  0%, 100% { box-shadow: 0 0 2px rgba(245, 158, 11, 0.3); }
  50% { box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
}

.ch-item__pct { font-size: 10px; color: #7777aa; min-width: 60px; text-align: right; }

.ch-item__claim,
.ch-item__start {
  margin-top: 6px;
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: all 0.15s;
}
.ch-item__claim {
  background: linear-gradient(135deg, #6c63ff, #5a52d5);
  color: #fff;
}
.ch-item__claim:hover { transform: scale(1.02); box-shadow: 0 2px 8px rgba(108, 99, 255, 0.35); }
.ch-item__claim--ms {
  background: linear-gradient(135deg, #a78bfa, #8b5cf6);
}
.ch-item__start {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
}
.ch-item__start:hover { transform: scale(1.02); box-shadow: 0 2px 8px rgba(245, 158, 11, 0.35); }

.ch-item__claimed-tag,
.ch-item__expired-tag {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  color: #4ade80;
}
.ch-item__expired-tag { color: #ef4444; }

.ch-item__rewards {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  font-size: 11px;
  color: #ccc;
}

.ch-empty {
  text-align: center;
  padding: 30px 0;
  color: #555577;
  font-size: 13px;
}

@media (max-width: 767px) {
  .ch-panel {
    max-width: 96vw;
    max-height: 85vh;
    border-radius: 12px;
  }
  .ch-panel__title { font-size: 15px; }
  .ch-item { padding: 8px 10px; }
  .ch-item__name { font-size: 12px; }
  .ch-item__desc { font-size: 10px; }
}
</style>
