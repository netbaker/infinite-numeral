<template>
  <Teleport to="body">
    <div v-if="visible" class="stats-overlay" @click.self="emit('close')">
      <div class="stats-card">
        <h2>数据统计</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">游戏时长</span>
            <span class="stat-value">{{ playTime }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">脉冲点击</span>
            <span class="stat-value">{{ totalClicks }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">手动收益</span>
            <span class="stat-value">{{ manualEarnings }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">当前数字</span>
            <span class="stat-value">{{ displayNumber }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">每秒产出</span>
            <span class="stat-value">{{ displayOutputPerSec }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总累计</span>
            <span class="stat-value">{{ displayTotalNumber }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">坍缩次数</span>
            <span class="stat-value">{{ prestigeCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">膨胀次数</span>
            <span class="stat-value">{{ expansionCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">超越次数</span>
            <span class="stat-value">{{ transcendCount }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">当前纪元</span>
            <span class="stat-value">{{ currentEpoch }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">星尘 / 暗能 / 奇点</span>
            <span class="stat-value">{{ stardust }} / {{ darkEnergy }} / {{ singularity }}</span>
          </div>
        </div>
        <h3 style="margin-top:12px;font-size:13px;color:var(--color-narrative);">生产者等级</h3>
        <div class="producer-grid">
          <div v-for="p in producerLevels" :key="p.id" class="prod-stat">
            <span class="prod-name">{{ p.name }}</span>
            <span class="prod-lv">Lv.{{ p.level }}</span>
          </div>
        </div>
        <button class="stats-close" @click="emit('close')">关闭</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { PRODUCER_CONFIGS, EPOCH_CONFIGS } from '@/core/Constants';
import { format } from '@/core/Formatter';
import { BigNumber } from '@/core/BigNumber';

const { visible } = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();

const gameStore = useGameStore();

const playTime = computed(() => {
  void gameStore.stateVersion;
  const elapsed = Date.now() - gameStore.gameState.gameStartTime;
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
});
const totalClicks = computed(() => { void gameStore.stateVersion; return gameStore.gameState.totalClicks; });
const manualEarnings = computed(() => { void gameStore.stateVersion; return format(BigNumber.from(gameStore.gameState.totalManualEarnings)); });
const displayNumber = computed(() => gameStore.displayNumber);
const displayOutputPerSec = computed(() => gameStore.displayOutputPerSec);
const displayTotalNumber = computed(() => gameStore.displayTotalNumber);
const prestigeCount = computed(() => { void gameStore.stateVersion; return gameStore.gameState.prestigeCount; });
const expansionCount = computed(() => { void gameStore.stateVersion; return gameStore.gameState.expansionCount; });
const transcendCount = computed(() => { void gameStore.stateVersion; return gameStore.gameState.transcendCount; });
const stardust = computed(() => { void gameStore.stateVersion; return gameStore.gameState.stardust; });
const darkEnergy = computed(() => { void gameStore.stateVersion; return gameStore.gameState.darkEnergy; });
const singularity = computed(() => { void gameStore.stateVersion; return gameStore.gameState.singularity; });
const currentEpoch = computed(() => {
  void gameStore.stateVersion;
  const ep = EPOCH_CONFIGS.find((e) => e.id === gameStore.gameState.currentEpoch);
  return ep?.name ?? '';
});
const producerLevels = computed(() => {
  void gameStore.stateVersion;
  return PRODUCER_CONFIGS.map((c) => ({
    id: c.id,
    name: c.name,
    level: gameStore.gameState.producers.get(c.id)?.level ?? 0,
  }));
});
</script>

<style scoped>
.stats-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); }
.stats-card { width: 420px; max-width: 92vw; max-height: 85vh; overflow-y: auto; padding: var(--spacing-lg); background: var(--color-surface); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--border-radius); }
.stats-card h2 { text-align: center; margin-bottom: var(--spacing-md); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
.stat-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.stat-label { font-size: 12px; color: var(--color-text-dim); }
.stat-value { font-size: 12px; color: var(--color-text); font-weight: 600; }
.producer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 4px; }
.prod-stat { display: flex; justify-content: space-between; padding: 2px 6px; background: rgba(255,255,255,0.02); border-radius: 3px; }
.prod-name { font-size: 11px; color: var(--color-text-dim); }
.prod-lv { font-size: 11px; color: var(--color-narrative); font-weight: 600; }
.stats-close { display: block; width: 100%; margin-top: var(--spacing-md); padding: 10px; background: var(--color-surface-hover); color: var(--color-text); border-radius: var(--border-radius); cursor: pointer; }
</style>
