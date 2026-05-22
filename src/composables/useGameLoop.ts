import { onMounted, onUnmounted, shallowRef, markRaw } from 'vue';
import { GameLoop } from '@/core/GameLoop';
import { useGameStore } from '@/stores/gameStore';
import { useSaveStore } from '@/stores/saveStore';
import { OfflineSystem } from '@/systems/OfflineSystem';
import { BigNumber } from '@/core/BigNumber';

/**
 * 游戏循环 Composable
 *
 * 管理游戏循环的生命周期：
 * - 创建 GameLoop 实例，注册 onTick 回调
 * - onMounted 自动启动，onUnmounted 自动停止
 * - 监听 visibilitychange 事件：
 *   - hidden → 暂停循环，记录离开时间
 *   - visible → 计算离线时间，如有收益则触发离线弹窗
 *
 * @returns { start, stop, isRunning }
 */
export function useGameLoop() {
  const gameStore = useGameStore();
  const saveStore = useSaveStore();
  const gameLoop = new GameLoop();
  const isRunning = shallowRef<boolean>(false);

  /** 页面隐藏时记录的离开时间戳（ms） */
  let leaveTime: number = 0;

  // ============================================================
  // Tick 回调
  // ============================================================

  gameLoop.onTick((deltaTime: number) => {
    gameStore.gameTick(deltaTime);
  });

  // ============================================================
  // 启动 / 停止
  // ============================================================

  function start(): void {
    if (isRunning.value) {
      return;
    }
    gameLoop.start();
    isRunning.value = true;
    gameStore.isRunning = true;
  }

  function stop(): void {
    if (!isRunning.value) {
      return;
    }
    gameLoop.stop();
    isRunning.value = false;
    gameStore.isRunning = false;
  }

  // ============================================================
  // visibilitychange — 离线检测
  // ============================================================

  function handleVisibilityChange(): void {
    const state = document.visibilityState;

    if (state === 'hidden') {
      // 页面隐藏 → 暂停循环 + 记录离开时间
      leaveTime = Date.now();
      stop();
    } else if (state === 'visible') {
      // 页面恢复 → 计算离线时长
      if (leaveTime > 0) {
        const offlineMs = Date.now() - leaveTime;

        // 离线超过 30 秒，计算离线收益
        if (offlineMs > 30000) {
          processOfflineEarnings(offlineMs);
        }

        leaveTime = 0;
      }

      // 恢复循环
      start();
    }
  }

  /**
   * 计算离线收益并应用到游戏状态
   *
   * @param offlineMs 离线毫秒数
   */
  function processOfflineEarnings(offlineMs: number): void {
    const offlineSystem = new OfflineSystem();
    const snapshot = gameStore.getSnapshot();
    const result = offlineSystem.getOfflineEarnings(snapshot, offlineMs);

    // 只有获得收益时才显示弹窗
    if (!result.gainedNumber.eq(0)) {
      // 应用离线收益到游戏状态
      const state = gameStore.getSnapshot();
      state.number = BigNumber.from(state.number).add(result.gainedNumber).toDecimal();
      state.totalNumber = BigNumber.from(state.totalNumber).add(result.gainedNumber).toDecimal();

      // 触发 UI 更新
      gameStore.bumpVersion();

      // 更新 saveStore 的离线弹窗状态（供 useOffline 读取）
      saveStore.$patch({
        offlineResult: markRaw(result),
        showOfflineDialog: true,
      });
    }
  }

  // ============================================================
  // 生命周期
  // ============================================================

  onMounted(() => {
    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
    stop();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    isRunning,
    start,
    stop,
  };
}
