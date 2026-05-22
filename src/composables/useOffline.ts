import { onMounted, onUnmounted } from 'vue';
import { useSaveStore } from '@/stores/saveStore';

/**
 * 离线检测与收益结算 Composable
 *
 * 功能：
 * - 首次加载时调用 saveStore.checkOfflineAndLoad() 加载存档 + 结算离线收益
 * - 监听 visibilitychange 事件：页面恢复时仅计算离线收益，不重新加载存档
 * - onUnmounted 时移除事件监听
 *
 * 离线弹窗由 OfflineRewardModal 组件直接从 saveStore 读取状态显示。
 */
export function useOffline() {
  const saveStore = useSaveStore();

  /** 记录上一次的 visibilityState */
  let lastVisibilityState: DocumentVisibilityState = document.visibilityState;

  /**
   * visibilitychange 事件处理器
   *
   * 仅在 hidden → visible 转换时计算离线收益（不清空/重载存档）。
   * 首次加载时的存档读取由 onMounted -> checkOfflineAndLoad 处理。
   */
  function handleVisibilityChange(): void {
    const currentState = document.visibilityState;

    if (lastVisibilityState === 'hidden' && currentState === 'visible') {
      // 仅计算离线收益，不从 IndexedDB 重新加载（保留内存中已更新的状态）
      saveStore.calculateOfflineEarnings();
    }

    lastVisibilityState = currentState;
  }

  onMounted(() => {
    // 首次加载时加载存档并计算离线收益
    saveStore.checkOfflineAndLoad();

    // 注册 visibilitychange 监听
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
}
