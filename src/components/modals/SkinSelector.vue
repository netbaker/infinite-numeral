<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="skin-selector">
      <header class="skin-selector__header">
        <h2>🎨 皮肤定制</h2>
        <button class="skin-selector__close" @click="$emit('close')">✕</button>
      </header>

      <!-- 数字皮肤 -->
      <section class="skin-section">
        <h3 class="skin-section__title">📝 数字皮肤</h3>
        <div class="skin-grid">
          <button
            v-for="def in skinDefs"
            :key="def.id"
            class="skin-card"
            :class="skinCardClass(def.id)"
            @click="onSkinCardClick(def.id)"
          >
            <div class="skin-card__preview">{{ previewForSkin(def.id) }}</div>
            <div class="skin-card__name">{{ def.name }}</div>
            <div class="skin-card__status">{{ skinStatusLabel(def.id) }}</div>
            <div v-if="isSkinActive(def.id)" class="skin-card__check">✅</div>
          </button>
        </div>
      </section>

      <!-- UI 主题 -->
      <section class="skin-section">
        <h3 class="skin-section__title">🎨 UI 主题</h3>
        <div class="skin-grid skin-grid--theme">
          <button
            v-for="def in themeDefs"
            :key="def.id"
            class="theme-card"
            :class="themeCardClass(def.id)"
            @click="onThemeCardClick(def.id)"
          >
            <div class="theme-card__preview">
              <span class="theme-card__swatch" :style="{ background: def.preview.bg }"></span>
              <span class="theme-card__swatch" :style="{ background: def.preview.primary }"></span>
              <span class="theme-card__swatch" :style="{ background: def.preview.accent }"></span>
            </div>
            <div class="theme-card__name">{{ def.name }}</div>
            <div class="theme-card__status">{{ themeStatusLabel(def.id) }}</div>
            <div v-if="isThemeActive(def.id)" class="theme-card__check">✅</div>
          </button>
        </div>
      </section>

      <footer class="skin-selector__footer">
        💡 皮肤和主题均为纯视觉效果，不影响游戏数值
      </footer>

      <!-- 解锁确认弹窗 -->
      <div v-if="confirm" class="confirm-overlay" @click.self="closeConfirm">
        <div class="confirm-dialog">
          <h3 class="confirm-dialog__title">解锁 {{ confirm.name }}？</h3>
          <div class="confirm-dialog__row">
            <span>解锁条件</span>
            <span :class="confirm.conditionMet ? 'ok' : 'no'">
              {{ confirm.conditionMet ? '✓ ' : '✗ ' }}{{ confirm.conditionText }}
            </span>
          </div>
          <div class="confirm-dialog__row">
            <span>消耗</span>
            <span :class="confirm.canAfford ? 'ok' : 'no'">
              {{ confirm.canAfford ? '✓ ' : '✗ ' }}{{ confirm.costLabel }}
            </span>
          </div>
          <p v-if="!confirm.canProceed" class="confirm-dialog__hint">
            {{ confirm.conditionMet ? '资源不足' : '解锁条件未满足' }}
          </p>
          <div class="confirm-dialog__actions">
            <button class="btn-cancel" @click="closeConfirm">取消</button>
            <button
              class="btn-confirm"
              :disabled="!confirm.canProceed"
              @click="confirmUnlock"
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';
import {
  SKIN_DEFS,
  THEME_DEFS,
  getCostLabel,
  isSkinConditionMet,
  isThemeConditionMet,
  hasEnoughResource,
} from '@/systems/SkinSystem';
import type { NumberSkinId, UIThemeId } from '@/types/game';

defineProps<{ visible: boolean }>();
defineEmits<{ (e: 'close'): void }>();

const gameStore = useGameStore();

const skinDefs = SKIN_DEFS;
const themeDefs = THEME_DEFS;

/** 预览数字（GDD §5.5 统一使用 123456789） */
const PREVIEW_NUMBER = BigNumber.from(123456789);

/** 强制追踪 stateVersion 变化 */
function tick(): void {
  void gameStore.stateVersion;
}

function previewForSkin(id: NumberSkinId): string {
  return format(PREVIEW_NUMBER, id);
}

// ---- 数字皮肤状态辅助 ----
function isSkinUnlocked(id: NumberSkinId): boolean {
  tick();
  return gameStore.unlockedNumberSkins.has(id);
}
function isSkinActive(id: NumberSkinId): boolean {
  tick();
  return gameStore.activeNumberSkin === id;
}
function skinStatusLabel(id: NumberSkinId): string {
  if (isSkinActive(id)) return '✅ 使用中';
  if (isSkinUnlocked(id)) return '🔓 已解锁';
  const def = skinDefs.find((d) => d.id === id)!;
  return `🔒 ${getCostLabel(def.unlockCost)}`;
}
function skinCardClass(id: NumberSkinId): Record<string, boolean> {
  return {
    'is-active': isSkinActive(id),
    'is-locked': !isSkinUnlocked(id),
  };
}

// ---- UI 主题状态辅助 ----
function isThemeUnlocked(id: UIThemeId): boolean {
  tick();
  return gameStore.unlockedThemes.has(id);
}
function isThemeActive(id: UIThemeId): boolean {
  tick();
  return gameStore.activeTheme === id;
}
function themeStatusLabel(id: UIThemeId): string {
  if (isThemeActive(id)) return '✅ 使用中';
  if (isThemeUnlocked(id)) return '🔓 已解锁';
  const def = themeDefs.find((d) => d.id === id)!;
  return `🔒 ${getCostLabel(def.unlockCost)}`;
}
function themeCardClass(id: UIThemeId): Record<string, boolean> {
  return {
    'is-active': isThemeActive(id),
    'is-locked': !isThemeUnlocked(id),
  };
}

// ---- 点击交互 ----
function onSkinCardClick(id: NumberSkinId): void {
  if (isSkinActive(id)) return;
  if (isSkinUnlocked(id)) {
    gameStore.setNumberSkin(id);
    return;
  }
  openConfirm('skin', id);
}

function onThemeCardClick(id: UIThemeId): void {
  if (isThemeActive(id)) return;
  if (isThemeUnlocked(id)) {
    gameStore.setTheme(id);
    return;
  }
  openConfirm('theme', id);
}

// ---- 解锁确认弹窗 ----
interface ConfirmState {
  kind: 'skin' | 'theme';
  id: string;
  name: string;
  conditionText: string;
  conditionMet: boolean;
  costLabel: string;
  canAfford: boolean;
  canProceed: boolean;
}

const confirm = ref<ConfirmState | null>(null);

function openConfirm(kind: 'skin' | 'theme', id: string): void {
  const state = gameStore.gameState;
  if (kind === 'skin') {
    const def = skinDefs.find((d) => d.id === id)!;
    const conditionMet = isSkinConditionMet(state, def);
    const canAfford = hasEnoughResource(state, def.unlockCost);
    confirm.value = {
      kind,
      id,
      name: def.name,
      conditionText: def.unlockCondition,
      conditionMet,
      costLabel: getCostLabel(def.unlockCost),
      canAfford,
      canProceed: conditionMet && canAfford,
    };
  } else {
    const def = themeDefs.find((d) => d.id === id)!;
    const conditionMet = isThemeConditionMet(state, def);
    const canAfford = hasEnoughResource(state, def.unlockCost);
    confirm.value = {
      kind,
      id,
      name: def.name,
      conditionText: def.unlockCondition,
      conditionMet,
      costLabel: getCostLabel(def.unlockCost),
      canAfford,
      canProceed: conditionMet && canAfford,
    };
  }
}

function closeConfirm(): void {
  confirm.value = null;
}

function confirmUnlock(): void {
  const c = confirm.value;
  if (!c || !c.canProceed) return;
  if (c.kind === 'skin') {
    gameStore.unlockNumberSkin(c.id as NumberSkinId);
  } else {
    gameStore.unlockTheme(c.id as UIThemeId);
  }
  closeConfirm();
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.skin-selector {
  width: min(680px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface-panel, var(--color-surface));
  border: 1px solid var(--color-border-accent, var(--color-border));
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  color: var(--color-text);
}

.skin-selector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}
.skin-selector__header h2 { font-size: 18px; margin: 0; }
.skin-selector__close {
  background: none; border: none; color: var(--color-text-dim);
  font-size: 18px; cursor: pointer;
}

.skin-section { margin-bottom: var(--spacing-md); }
.skin-section__title { font-size: 14px; margin: 0 0 var(--spacing-sm); color: var(--color-text-dim); }

.skin-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

/* 数字皮肤卡片 120×100 */
.skin-card {
  position: relative;
  width: 120px;
  height: 100px;
  border-radius: 8px;
  background: var(--color-surface-hover);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  padding: 6px;
}
.skin-card__preview {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-number, var(--color-text));
  text-shadow: 0 0 8px var(--color-number-glow, transparent);
}
.skin-card__name { font-size: 12px; }
.skin-card__status { font-size: 11px; color: var(--color-text-dim); }
.skin-card.is-active { border-color: var(--color-narrative); }
.skin-card.is-locked { opacity: 0.55; }
.skin-card__check {
  position: absolute; top: 4px; right: 4px; font-size: 12px;
}

/* UI 主题卡片 100×80 */
.skin-grid--theme .theme-card {
  position: relative;
  width: 100px;
  height: 80px;
  border-radius: 8px;
  background: var(--color-surface-hover);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  padding: 6px;
}
.theme-card__preview {
  display: flex;
  width: 80%;
  height: 24px;
  border-radius: 4px;
  overflow: hidden;
}
.theme-card__swatch { flex: 1; }
.theme-card__name { font-size: 12px; }
.theme-card__status { font-size: 11px; color: var(--color-text-dim); }
.theme-card.is-active { border-color: var(--color-narrative); }
.theme-card.is-locked { opacity: 0.55; }
.theme-card__check {
  position: absolute; top: 4px; right: 4px; font-size: 12px;
}

.skin-selector__footer {
  margin-top: var(--spacing-sm);
  font-size: 12px;
  color: var(--color-text-dim);
  text-align: center;
}

/* 解锁确认弹窗 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.confirm-dialog {
  width: min(360px, 90vw);
  background: var(--color-surface-panel, var(--color-surface));
  border: 1px solid var(--color-border-accent, var(--color-border));
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
  color: var(--color-text);
}
.confirm-dialog__title { margin: 0 0 var(--spacing-sm); font-size: 16px; }
.confirm-dialog__row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
}
.confirm-dialog__row .ok { color: var(--color-growth); }
.confirm-dialog__row .no { color: var(--color-cost); }
.confirm-dialog__hint {
  font-size: 12px;
  color: var(--color-cost);
  margin: 4px 0;
}
.confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.btn-cancel, .btn-confirm {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.btn-cancel { background: var(--color-surface-hover); color: var(--color-text); }
.btn-confirm { background: var(--color-narrative); color: #fff; }
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
