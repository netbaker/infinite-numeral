<template>
  <Teleport to="body">
    <div v-if="visible" class="prestige-overlay" @click.self="onCancel">
      <div class="prestige-card">
        <!-- 警告图标 -->
        <div class="prestige-card__icon">⚠️</div>

        <h2 class="prestige-card__title">坍缩确认</h2>

        <p class="prestige-card__desc">
          当前数字将重置，你将获得
          <span class="prestige-card__stardust">✦ {{ stardustGain }} 星尘</span>
        </p>

        <!-- 重置内容列表 -->
        <div class="prestige-card__reset-list">
          <span class="prestige-card__reset-label">将重置以下内容：</span>
          <ul class="prestige-card__reset-items">
            <li>当前数字</li>
            <li>累计总数字</li>
            <li>所有生产者等级</li>
            <li>所有常规升级等级</li>
            <li>纪元进度</li>
          </ul>
        </div>

        <!-- 保留内容 -->
        <p class="prestige-card__keep">
          保留：星尘、星尘升级、重置次数
        </p>

        <!-- 按钮区 -->
        <div class="prestige-card__actions">
          <button class="prestige-card__btn prestige-card__btn--cancel" @click="onCancel">
            取消
          </button>
          <button class="prestige-card__btn prestige-card__btn--confirm" @click="onConfirm">
            确认坍缩
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  stardustGain: number;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function onConfirm(): void {
  emit('confirm');
}

function onCancel(): void {
  emit('cancel');
}
</script>

<style scoped>
.prestige-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.7);
  animation: fadeIn 0.2s ease;
}

.prestige-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  width: 380px;
  max-width: 90vw;
  padding: var(--spacing-lg);
  background-color: var(--color-surface);
  border-radius: var(--border-radius);
  border: 1px solid rgba(156, 39, 176, 0.3);
  animation: slideUp 0.3s ease;
}

.prestige-card__icon {
  font-size: 36px;
  line-height: 1;
}

.prestige-card__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-prestige);
  letter-spacing: 4px;
}

.prestige-card__desc {
  font-size: 14px;
  color: var(--color-text);
  text-align: center;
  line-height: 1.6;
}

.prestige-card__stardust {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-milestone);
}

.prestige-card__reset-list {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: rgba(244, 67, 54, 0.05);
  border: 1px solid rgba(244, 67, 54, 0.15);
  border-radius: var(--border-radius);
}

.prestige-card__reset-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-cost);
  margin-bottom: var(--spacing-xs);
  letter-spacing: 1px;
}

.prestige-card__reset-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.prestige-card__reset-items li {
  font-size: 13px;
  color: var(--color-cost);
  padding-left: 16px;
  position: relative;
}

.prestige-card__reset-items li::before {
  content: '✕';
  position: absolute;
  left: 0;
  font-size: 11px;
}

.prestige-card__keep {
  font-size: 12px;
  color: var(--color-text-dim);
  text-align: center;
}

.prestige-card__actions {
  display: flex;
  gap: var(--spacing-md);
  width: 100%;
  margin-top: var(--spacing-xs);
}

.prestige-card__btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.prestige-card__btn:active {
  transform: scale(0.97);
}

.prestige-card__btn--cancel {
  background-color: var(--color-surface-hover);
  color: var(--color-text);
}

.prestige-card__btn--cancel:hover {
  background-color: #2f2f50;
}

.prestige-card__btn--confirm {
  background-color: var(--color-prestige);
  color: #fff;
}

.prestige-card__btn--confirm:hover {
  background-color: #ab47bc;
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
