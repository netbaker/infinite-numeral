<template>
  <div class="center-panel">
    <EpochIndicator />
    <NumberDisplay />
    <div class="center-panel__click-area">
      <PulseButton @click-value="onPulseClickValue" />
      <ClickEffect
        v-for="effect in clickEffects"
        :key="effect.id"
        :value="effect.value"
        :is-crit="effect.isCrit"
        :style="{ left: effect.x + 'px', top: effect.y + 'px' }"
        class="center-panel__float-text"
      />
    </div>
    <div class="center-panel__prestige">
      <PrestigeButton v-if="canPrestige" />
      <button v-if="hasTechExpand" class="expand-button" @click="showExpandConfirm = true">
        <div class="expand-button__title">膨胀</div>
        <div class="expand-button__gain">获得 ◉ {{ expandGain }} 暗能量</div>
      </button>
      <button v-if="canTranscend" class="transcend-button" @click="showTranscendConfirm = true">
        <div class="transcend-button__title">超越</div>
        <div class="transcend-button__gain">获得 ◆ {{ transcendGain }} 奇点</div>
      </button>
    </div>
    <!-- 膨胀确认弹窗 -->
    <div v-if="showExpandConfirm" class="modal-overlay" @click.self="showExpandConfirm = false">
      <div class="modal-content">
        <h3>确认膨胀？</h3>
        <p>将重置数字、生产者、升级、星尘和星尘升级。</p>
        <p>保留：暗能量升级、科技树、已解锁生产者。</p>
        <p class="modal-gain">获得 ◉ {{ expandGain }} 暗能量</p>
        <p v-if="!canExpand" class="modal-hint" style="color: #ff6b6b; margin-top: 8px;">
          累计星尘不足（{{ gameStore.gameState.cumulativeStardust }}/100）
        </p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showExpandConfirm = false">取消</button>
          <button class="btn-confirm" :disabled="!canExpand" @click="handleExpand">确认膨胀</button>
        </div>
      </div>
    </div>
    <!-- 超越确认弹窗 -->
    <div v-if="showTranscendConfirm" class="modal-overlay" @click.self="showTranscendConfirm = false">
      <div class="modal-content modal-transcend">
        <h3>确认超越？</h3>
        <p>将重置几乎一切：数字、生产者、升级、星尘、暗能量。</p>
        <p>保留：元升级、科技树、已解锁生产者。</p>
        <p class="modal-gain modal-gain--transcend">获得 ◆ {{ transcendGain }} 奇点</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="showTranscendConfirm = false">取消</button>
          <button class="btn-confirm btn-transcend" @click="handleTranscend">确认超越</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import NumberDisplay from '@/components/game/NumberDisplay.vue';
import PulseButton from '@/components/game/PulseButton.vue';
import PrestigeButton from '@/components/game/PrestigeButton.vue';
import EpochIndicator from '@/components/progress/EpochIndicator.vue';
import ClickEffect from '@/components/feedback/ClickEffect.vue';
import { BigNumber } from '@/core/BigNumber';

const gameStore = useGameStore();

const canPrestige = computed(() => {
  void gameStore.stateVersion;
  return gameStore.canPrestige();
});

/* 膨胀按钮显示条件：科技树 tech_expand 已解锁（不检查星尘，让用户能看到按钮） */
const hasTechExpand = computed(() => {
  void gameStore.stateVersion;
  const node = gameStore.gameState.techTree.get('tech_expand');
  return !!node && node.unlocked;
});

/* 是否可以执行膨胀（点击时校验） */
const canExpand = computed(() => {
  void gameStore.stateVersion;
  return gameStore.expansionSystem.canExpand(gameStore.gameState);
});

const expandGain = computed(() => {
  void gameStore.stateVersion;
  return gameStore.expansionSystem.calculateDarkEnergy(gameStore.gameState.cumulativeStardust);
});

const showExpandConfirm = ref(false);
const showTranscendConfirm = ref(false);

function handleExpand(): void {
  if (!canExpand.value) {
    showExpandConfirm.value = false;
    return;
  }
  gameStore.executeExpansion();
  showExpandConfirm.value = false;
}

function handleTranscend(): void {
  gameStore.executeTranscend();
  showTranscendConfirm.value = false;
}

const canTranscend = computed(() => {
  void gameStore.stateVersion;
  return gameStore.transcendSystem.canTranscend(gameStore.gameState);
});

const transcendGain = computed(() => {
  void gameStore.stateVersion;
  return gameStore.transcendSystem.calculateSingularity(gameStore.gameState.cumulativeDarkEnergy);
});

interface ClickEffectData { id: number; value: BigNumber; isCrit: boolean; x: number; y: number; }
let effectCounter = 0;
const clickEffects = shallowRef<ClickEffectData[]>([]);

function onPulseClickValue(payload: { value: BigNumber; isCrit: boolean; x: number; y: number }): void {
  const id = ++effectCounter;
  const effect: ClickEffectData = { id, value: payload.value, isCrit: payload.isCrit, x: payload.x, y: payload.y };
  clickEffects.value = [...clickEffects.value, effect];
  setTimeout(() => { clickEffects.value = clickEffects.value.filter((e) => e.id !== id); }, 1000);
}
</script>

<style scoped>
.center-panel {
  display: flex; flex-direction: column; align-items: center;
  flex: 1; min-width: 0; min-height: 0;
  padding: var(--spacing-sm); gap: var(--spacing-sm);
  overflow-y: auto; position: relative;
}
.center-panel__click-area { position: relative; display: flex; align-items: center; justify-content: center; }
.center-panel__float-text { position: absolute; pointer-events: none; z-index: 10; }
.center-panel__prestige { display: flex; flex-direction: column; gap: var(--spacing-xs); flex-shrink: 0; }

.expand-button {
  display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, rgba(var(--color-tech-accent-rgb),0.2), rgba(var(--color-tech-accent-rgb),0.05));
  border: 2px solid var(--color-narrative); border-radius: var(--border-radius); cursor: pointer;
}
.expand-button:hover { background: linear-gradient(135deg, rgba(var(--color-tech-accent-rgb),0.35), rgba(var(--color-tech-accent-rgb),0.1)); box-shadow: 0 0 20px rgba(var(--color-tech-accent-rgb),0.3); }
.expand-button__title { font-size: 16px; font-weight: 700; color: var(--color-narrative); letter-spacing: 4px; }
.expand-button__gain { font-size: 14px; font-weight: 600; color: var(--color-narrative); }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100;
  padding: 16px;
}
.modal-content {
  background: var(--color-surface); border: 1px solid var(--color-narrative);
  border-radius: var(--border-radius); padding: var(--spacing-lg); text-align: center;
  width: 100%; max-width: min(400px, 100%);
}
.modal-content h3 { color: var(--color-narrative); margin-bottom: var(--spacing-sm); font-size: 16px; }
.modal-content p { color: var(--color-text-dim); font-size: 13px; margin-bottom: 4px; line-height: 1.5; }
.modal-gain { color: var(--color-narrative); font-weight: 700; font-size: 16px !important; margin-top: var(--spacing-sm) !important; }
.modal-actions { display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-md); flex-wrap: wrap; }
.btn-cancel {
  padding: 8px 24px; border: 1px solid rgba(255,255,255,0.2);
  background: transparent; color: var(--color-text-dim);
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
.btn-confirm { padding: 8px 24px; border: none; background: var(--color-narrative); color: #000; font-weight: 700; border-radius: 4px; cursor: pointer; font-size: 13px; }
.btn-confirm:disabled { background: #555; color: #999; cursor: not-allowed; }
.btn-transcend { background: var(--color-milestone); }
.transcend-button {
  display: flex; flex-direction: column; align-items: center; gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05));
  border: 2px solid var(--color-milestone); border-radius: var(--border-radius); cursor: pointer;
}
.transcend-button:hover { background: linear-gradient(135deg, rgba(255,215,0,0.35), rgba(255,215,0,0.1)); box-shadow: 0 0 20px rgba(255,215,0,0.3); }
.transcend-button__title { font-size: 16px; font-weight: 700; color: var(--color-milestone); letter-spacing: 4px; }
.transcend-button__gain { font-size: 14px; font-weight: 600; color: var(--color-milestone); }
.modal-transcend { border-color: var(--color-milestone); }
.modal-transcend h3 { color: var(--color-milestone); }
  .modal-gain--transcend { color: var(--color-milestone) !important; }

@media (max-height: 650px) {
  .center-panel { padding: 4px; gap: 4px; }
}
@media (max-width: 767px) {
  .center-panel { padding: 6px 8px; gap: 6px; }
  .expand-button { padding: 6px 16px; }
  .expand-button__title { font-size: 14px; letter-spacing: 2px; }
  .expand-button__gain { font-size: 12px; }
  .transcend-button { padding: 6px 16px; }
  .transcend-button__title { font-size: 14px; letter-spacing: 2px; }
  .transcend-button__gain { font-size: 12px; }
  .modal-content { padding: 16px 14px; }
  .modal-content h3 { font-size: 15px; }
  .btn-cancel, .btn-confirm { padding: 8px 18px; font-size: 12px; }
}
</style>
