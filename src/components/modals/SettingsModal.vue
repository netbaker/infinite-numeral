<template>
  <Teleport to="body">
    <div v-if="visible" class="settings-overlay" @click.self="onClose">
      <div class="settings-card">
        <h2 class="settings-card__title">设置</h2>

        <!-- 存档管理 -->
        <div class="settings-card__section">
          <h3 class="settings-card__section-title">存档管理</h3>
          <div class="settings-card__btn-group">
            <button
              class="settings-card__btn settings-card__btn--save"
              :disabled="isSaving"
              @click="handleSave"
            >
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
            <button
              class="settings-card__btn settings-card__btn--load"
              @click="handleLoad"
            >
              加载
            </button>
            <button
              class="settings-card__btn settings-card__btn--reset"
              @click="handleResetClick"
            >
              重置
            </button>
          </div>

          <div class="settings-card__btn-group" style="margin-top:6px">
            <button class="settings-card__btn settings-card__btn--save" @click="handleExport">导出</button>
            <button class="settings-card__btn settings-card__btn--load" @click="handleImport">导入</button>
          </div>
          <input ref="fileInput" type="file" accept=".json" style="display:none" @change="onFileSelected" />

          <!-- 重置二次确认 -->
          <div v-if="confirmReset" class="settings-card__confirm">
            <span class="settings-card__confirm-text">
              确定要重置所有数据？此操作不可撤销！
            </span>
            <div class="settings-card__confirm-actions">
              <button
                class="settings-card__btn settings-card__btn--reset"
                @click="confirmResetAction"
              >
                确认重置
              </button>
              <button
                class="settings-card__btn settings-card__btn--cancel"
                @click="cancelReset"
              >
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- 存档信息 -->
        <div class="settings-card__section">
          <h3 class="settings-card__section-title">存档信息</h3>
          <div class="settings-card__info">
            <div class="settings-card__info-row">
              <span class="settings-card__info-label">版本号</span>
              <span class="settings-card__info-value">v{{ saveVersion }}</span>
            </div>
            <div class="settings-card__info-row">
              <span class="settings-card__info-label">上次保存</span>
              <span class="settings-card__info-value">{{ lastSaveText }}</span>
            </div>
          </div>
        </div>

        <!-- 帮助 -->
        <div class="settings-card__section">
          <h3 class="settings-card__section-title">帮助</h3>
          <div class="settings-card__btn-group">
            <button class="settings-card__btn settings-card__btn--save" @click="emit('restart-tutorial')">
              重新开始新手引导
            </button>
          </div>
        </div>

        <!-- 关闭按钮 -->
        <button class="settings-card__close" @click="onClose">关闭</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSaveStore } from '@/stores/saveStore';
import { useGameStore } from '@/stores/gameStore';
import { serialize } from '@/core/Serializer';
import { SAVE_VERSION } from '@/core/Constants';

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  'restart-tutorial': [];
}>();

const saveStore = useSaveStore();
const gameStore = useGameStore();

/** 是否正在保存 */
const isSaving = computed(() => saveStore.isSaving);

/** 文件选择器 */
const fileInput = ref<HTMLInputElement | null>(null);

/** 导出存档 */
function handleExport(): void {
  const state = gameStore.getSnapshot();
  const data = serialize(state);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `infinite-numeral-save-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 触发导入文件选择 */
function handleImport(): void {
  fileInput.value?.click();
}

/** 文件选择后处理 */
async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.version || !data.state) throw new Error('Invalid save format');
    gameStore.loadFromSave(data);
    onClose();
  } catch {
    alert('无效的存档文件');
  }
  input.value = '';
}

/** 是否显示重置二次确认 */
const confirmReset = ref<boolean>(false);

/** 存档版本号 */
const saveVersion = SAVE_VERSION;

/** 上次保存时间文本 */
const lastSaveText = computed(() => {
  const lastTime = saveStore.lastSaveTime;
  if (lastTime === 0) {
    return '未保存';
  }
  const elapsed = Math.floor((Date.now() - lastTime) / 1000);
  if (elapsed < 60) {
    return `${elapsed}秒前`;
  }
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) {
    return `${minutes}分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}小时前`;
});

/** 保存按钮 */
async function handleSave(): Promise<void> {
  await saveStore.saveGame();
}

/** 加载按钮 */
async function handleLoad(): Promise<void> {
  const success = await saveStore.loadGame();
  if (success) {
    onClose();
  }
}

/** 重置按钮 — 显示二次确认 */
function handleResetClick(): void {
  confirmReset.value = true;
}

/** 确认重置 */
async function confirmResetAction(): Promise<void> {
  await saveStore.deleteSaveAction();
  confirmReset.value = false;
  onClose();
}

/** 取消重置 */
function cancelReset(): void {
  confirmReset.value = false;
}

function onClose(): void {
  confirmReset.value = false;
  emit('close');
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.2s ease;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  width: 400px;
  max-width: 90vw;
  max-height: 80vh;
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.settings-card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 4px;
  text-align: center;
}

.settings-card__section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.settings-card__section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-dim);
  letter-spacing: 1px;
  padding-bottom: var(--spacing-xs);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.settings-card__btn-group {
  display: flex;
  gap: var(--spacing-sm);
}

.settings-card__btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.settings-card__btn:active {
  transform: scale(0.97);
}

.settings-card__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings-card__btn--save {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.settings-card__btn--save:hover:not(:disabled) {
  background-color: #2f2f50;
}

.settings-card__btn--load {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.settings-card__btn--load:hover {
  background-color: #2f2f50;
}

.settings-card__btn--reset {
  background-color: var(--color-cost);
  color: #fff;
}

.settings-card__btn--reset:hover {
  background-color: #e53935;
}

.settings-card__btn--cancel {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.settings-card__btn--cancel:hover {
  background-color: #2f2f50;
}

/* 二次确认区域 */
.settings-card__confirm {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(244, 67, 54, 0.05);
  border: 1px solid rgba(244, 67, 54, 0.15);
  border-radius: var(--border-radius);
  animation: fadeIn 0.15s ease;
}

.settings-card__confirm-text {
  font-size: 13px;
  color: var(--color-cost);
  text-align: center;
  line-height: 1.5;
}

.settings-card__confirm-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* 存档信息 */
.settings-card__info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.settings-card__info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
}

.settings-card__info-label {
  font-size: 13px;
  color: var(--color-text-dim);
}

.settings-card__info-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

/* 关闭按钮 */
.settings-card__close {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-surface-hover);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.settings-card__close:hover {
  background-color: #2f2f50;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
