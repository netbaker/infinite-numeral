import { onMounted, onUnmounted, computed } from 'vue';
import { useSaveStore } from '@/stores/saveStore';
import { AUTO_SAVE_INTERVAL_MS } from '@/core/Constants';

/**
 * 自动存档 Composable
 *
 * 三层保险：
 * 1. 定时器每30秒保存
 * 2. 页面隐藏时立即保存（切Tab/锁屏/手机Home键）
 * 3. 页面关闭/刷新前保存（beforeunload）
 */
export function useAutoSave() {
  const saveStore = useSaveStore();

  let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  const lastSaveTime = computed(() => saveStore.lastSaveTime);

  function startAutoSave(): void {
    stopAutoSave();
    autoSaveTimer = setInterval(() => {
      saveStore.saveGame();
    }, AUTO_SAVE_INTERVAL_MS);
  }

  function stopAutoSave(): void {
    if (autoSaveTimer !== null) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  /** 紧急保存 */
  function emergencySave(): void {
    saveStore.saveGame();
  }

  onMounted(() => {
    startAutoSave();
  });

  // 全局事件（非 Vue 生命周期）
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', emergencySave);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) emergencySave();
    });
  }

  onUnmounted(() => {
    stopAutoSave();
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', emergencySave);
    }
  });

  return {
    startAutoSave,
    stopAutoSave,
    lastSaveTime,
  };
}
