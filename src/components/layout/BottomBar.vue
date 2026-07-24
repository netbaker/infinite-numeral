<template>
  <footer class="bottom-bar">
    <div class="bottom-bar__item">
      <span class="bottom-bar__label">坍缩</span>
      <span class="bottom-bar__value bottom-bar__value--prestige">
        {{ prestigeCount }}
      </span>
    </div>
    <div class="bottom-bar__divider" />
    <div class="bottom-bar__item">
      <span class="bottom-bar__label">星尘</span>
      <span class="bottom-bar__value bottom-bar__value--stardust">
        ✦ {{ stardust }}
      </span>
    </div>
    <div class="bottom-bar__divider" />
    <div class="bottom-bar__item" v-if="expansionCount > 0 || darkEnergy > 0">
      <span class="bottom-bar__label">暗能</span>
      <span class="bottom-bar__value bottom-bar__value--darkenergy">
        ◉ {{ darkEnergy }}
      </span>
    </div>
    <div class="bottom-bar__divider" v-if="expansionCount > 0 || darkEnergy > 0" />
    <div class="bottom-bar__item" v-if="transcendCount > 0 || singularity > 0">
      <span class="bottom-bar__label">奇点</span>
      <span class="bottom-bar__value bottom-bar__value--transcend">
        ◆ {{ singularity }}
      </span>
    </div>
    <div class="bottom-bar__divider" v-if="transcendCount > 0 || singularity > 0" />
    <div class="bottom-bar__item">
      <span class="bottom-bar__label">纪元</span>
      <span class="bottom-bar__value bottom-bar__value--narrative">
        {{ currentEpochName }}
      </span>
    </div>
    <div class="bottom-bar__divider" />
    <div class="bottom-bar__item">
      <span class="bottom-bar__label">存档</span>
      <span class="bottom-bar__value bottom-bar__value--dim">
        {{ saveStatusText }}
      </span>
    </div>
    <div class="bottom-bar__divider" />
    <!-- 熵值进度条 -->
    <EntropyBar
      :entropy="entropy"
      :stabilizers="stabilizers"
      :rewinds="rewinds"
      :barriers="barriers"
      :barrier-active-until="barrierActiveUntil"
      @open-details="emit('openStats')"
      @use-stabilizer="emit('useStabilizer')"
      @use-rewind="emit('useRewind')"
      @use-barrier="emit('useBarrier')"
    />
    <div class="bottom-bar__divider" />
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--dimension" @click="emit('openDimension')" title="维度系统">
      🗺️
      <span v-if="dimensionCrystals > 0" class="dimension-badge">{{ dimensionCrystals }}</span>
    </button>
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--gene" @click="emit('openGene')" title="基因链">🧬</button>
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--persona" @click="emit('openPersona')" :title="`数字人格（推荐：${recommendedPersonaName}）`">
      🎭
      <span v-if="personaUpgradeAvailable" class="persona-badge">↑</span>
    </button>
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--codex" @click="emit('openCodex')" title="数字神话图鉴">📖</button>
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--archive" @click="emit('openArchive')" title="宇宙档案馆">🏛️</button>
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--skin" @click="emit('openSkin')" title="皮肤定制">🎨</button>
    <button class="bottom-bar__settings-btn" @click="emit('openStats')" title="统计">📊</button>
    <button class="bottom-bar__settings-btn" @click="emit('openAchievements')" title="成就">🏆</button>
    <button class="bottom-bar__settings-btn bottom-bar__settings-btn--challenge" @click="emit('openChallenge')" title="挑战任务">⚔️</button>
    <button class="bottom-bar__settings-btn" @click="emit('openHelp')" title="帮助">?</button>
    <button class="bottom-bar__settings-btn" @click="emit('openSettings')" title="设置">⚙</button>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useSaveStore } from '@/stores/saveStore';
import { EPOCH_CONFIGS } from '@/core/Constants';
import * as personaSystem from '@/systems/PersonaSystem';
import EntropyBar from '@/components/game/EntropyBar.vue';

const gameStore = useGameStore();
const saveStore = useSaveStore();

const emit = defineEmits<{
  openSettings: []; openHelp: []; openStats: []; openAchievements: []; openChallenge: [];
  openDimension: []; openGene: []; openArchive: []; openCodex: []; openSkin: []; openPersona: [];
  useStabilizer: []; useRewind: []; useBarrier: [];
}>();

const prestigeCount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.prestigeCount;
});

const stardust = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.stardust;
});

const darkEnergy = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.darkEnergy;
});

const expansionCount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.expansionCount;
});

const transcendCount = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.transcendCount;
});

const singularity = computed(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.singularity;
});

const currentEpochName = computed(() => {
  void gameStore.stateVersion;
  const epoch = EPOCH_CONFIGS.find((e) => e.id === gameStore.gameState.currentEpoch);
  return epoch ? epoch.name : '未知';
});

const saveStatusText = computed(() => {
  if (saveStore.isSaving) return '保存中...';
  if (saveStore.lastSaveTime === 0) return '未保存';
  const elapsed = Math.floor((Date.now() - saveStore.lastSaveTime) / 1000);
  if (elapsed < 60) return `${elapsed}秒前`;
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  return `${hours}小时前`;
});

// ---- 熵崩系统数据 ----
const entropy = computed(() => gameStore.entropyDisplayPercent || gameStore.gameState.entropy);
const stabilizers = computed(() => gameStore.gameState.entropyStabilizers);
const rewinds = computed(() => gameStore.gameState.entropyRewinds);
const barriers = computed(() => gameStore.gameState.entropyBarriers);
const barrierActiveUntil = computed(() => gameStore.gameState._barrierActiveUntil);

// ---- 维度系统数据 ----
const dimensionCrystals = computed<number>(() => {
  void gameStore.stateVersion;
  return gameStore.gameState.dimensionCrystals.toNumber() || 0;
});

// ---- 数字人格（A③ Digital Persona）入口状态 ----
// 推荐人格（基于历史深度向量，GDD §2.1 自主权：仅推荐，玩家可无视）。
const recommendedPersonaId = computed(() => {
  void gameStore.stateVersion;
  return personaSystem.getRecommendedPersona(gameStore.personaVector);
});
const recommendedPersonaName = computed(() =>
  personaSystem.PERSONA_META[recommendedPersonaId.value].name,
);
// 推荐徽标：当前激活人格可负担升级（印记充足）时显示「↑」提示（GDD §2.1 推荐 + §5 升级按钮）。
const personaUpgradeAvailable = computed(() => {
  void gameStore.stateVersion;
  return personaSystem.canUpgradeActivePersona(gameStore.gameState);
});
</script>

<style scoped>
.bottom-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  height: 40px;
  padding: 0 var(--spacing-lg);
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
}
.bottom-bar__item { display: flex; align-items: center; gap: var(--spacing-xs); }
.bottom-bar__label { color: var(--color-text-dim); }
.bottom-bar__value { font-weight: 600; }
.bottom-bar__value--prestige { color: var(--color-prestige); }
.bottom-bar__value--stardust { color: var(--color-milestone); }
.bottom-bar__value--darkenergy { color: var(--color-narrative); }
.bottom-bar__value--transcend { color: var(--color-milestone); }
.bottom-bar__value--narrative { color: var(--color-narrative); }
.bottom-bar__value--dim { color: var(--color-text-dim); }
.bottom-bar__divider { width: 1px; height: 16px; background-color: var(--color-border-strong); }
.bottom-bar__settings-btn {
  background: none; border: 1px solid var(--color-border-strong);
  color: var(--color-text-dim); font-size: 16px; cursor: pointer;
  padding: 2px 6px; border-radius: 4px; line-height: 1;
}
.bottom-bar__settings-btn:hover { color: var(--color-text); border-color: rgba(255,255,255,0.3); }
.bottom-bar__settings-btn--persona { position: relative; }
.persona-badge {
  position: absolute; top: -6px; right: -6px;
  background: var(--color-milestone); color: #1a1a1a;
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 1px 3px; border-radius: 6px;
}

/* ---- 移动端适配 ---- */
@media (max-width: 767px) {
  .bottom-bar {
    height: auto;
    min-height: 36px;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 6px;
    padding: 4px 8px;
    font-size: 11px;
  }
  .bottom-bar__divider { height: 10px; }
  .bottom-bar__settings-btn {
    padding: 1px 4px;
    font-size: 13px;
  }
}
</style>
