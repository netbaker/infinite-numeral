import { defineStore } from 'pinia';
import { markRaw, shallowRef } from 'vue';
import { useGameStore } from './gameStore';
import { serialize } from '@/core/Serializer';
import { saveGame as dbSave, loadGame as dbLoad, deleteSave as dbDelete, getArchiveRecords as dbGetArchives } from '@/db/database';
import type { ArchiveRecordDB } from '@/db/database';
import { OfflineSystem } from '@/systems/OfflineSystem';
import type { OfflineResult } from '@/types/game';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';
import { AUTO_SAVE_INTERVAL_MS } from '@/core/Constants';

/**
 * 存档管理 Store
 *
 * 负责存档的保存、加载、删除和离线收益处理。
 */
export const useSaveStore = defineStore('save', () => {
  // ============================================================
  // State
  // ============================================================

  /** 上次保存时间 */
  const lastSaveTime = shallowRef<number>(0);

  /** 是否正在保存 */
  const isSaving = shallowRef<boolean>(false);

  /** 离线收益弹窗数据 */
  const offlineResult = shallowRef<OfflineResult | null>(null);

  /** 离线收益弹窗是否显示 */
  const showOfflineDialog = shallowRef<boolean>(false);

  /** 自动保存定时器ID */
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // ============================================================
  // Actions
  // ============================================================

  /**
   * 保存游戏
   *
   * 获取 gameStore.getSnapshot()，序列化，存入 DB。
   */
  async function saveGame(): Promise<void> {
    if (isSaving.value) {
      return;
    }

    isSaving.value = true;
    try {
      const gameStore = useGameStore();
      const state = gameStore.getSnapshot();
      const data = serialize(state);
      await dbSave(data);
      lastSaveTime.value = Date.now();
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * 加载游戏
   *
   * 从 DB 读取，反序列化，传给 gameStore.loadFromSave()。
   *
   * @returns 是否成功加载
   */
  async function loadGame(): Promise<boolean> {
    const data = await dbLoad();
    if (!data) {
      return false;
    }

    const gameStore = useGameStore();
    gameStore.loadFromSave(data);
    lastSaveTime.value = data.timestamp;
    return true;
  }

  /**
   * 删除存档并重置游戏
   */
  async function deleteSaveAction(): Promise<void> {
    await dbDelete();
    const gameStore = useGameStore();
    gameStore.initNewGame();
    lastSaveTime.value = 0;
  }

  /**
   * 检查离线时间并加载游戏
   *
   * 如有离线收益则显示弹窗。
   *
   * @returns 是否有离线收益
   */
  async function checkOfflineAndLoad(): Promise<boolean> {
    const data = await dbLoad();
    if (!data) {
      // 无存档，初始化新游戏
      const gameStore = useGameStore();
      gameStore.initNewGame();
      return false;
    }

    // 先加载游戏
    const gameStore = useGameStore();
    gameStore.loadFromSave(data);
    lastSaveTime.value = data.timestamp;

    // 计算离线时间
    const now = Date.now();
    const lastTickTime = gameStore.getSnapshot().lastTickTime;
    const offlineMs = now - lastTickTime;

    // 如果离线超过1分钟，计算离线收益
    if (offlineMs > 60000) {
      const offlineSystem = new OfflineSystem();
      const result = offlineSystem.getOfflineEarnings(gameStore.getSnapshot(), offlineMs);

      if (!result.gainedNumber.eq(0)) {
        // 应用离线收益
        const state = gameStore.getSnapshot();
        state.number = BigNumber.from(state.number).add(result.gainedNumber).toDecimal();
        state.totalNumber = BigNumber.from(state.totalNumber).add(result.gainedNumber).toDecimal();

        // 触发 UI 更新
        gameStore.bumpVersion();

        // markRaw BigNumber in OfflineResult to avoid Vue proxy
        offlineResult.value = markRaw(result);
        showOfflineDialog.value = true;
      }
    }

    return offlineResult.value !== null;
  }

  /**
   * 关闭离线收益弹窗
   */
  function dismissOfflineDialog(): void {
    showOfflineDialog.value = false;
    offlineResult.value = null;
  }

  /**
   * 计算并显示离线收益（不清空存档，不重新加载）
   *
   * 用于 visibilitychange 恢复时：在内存已有存档的基础上，计算离线收益并弹窗。
   */
  async function calculateOfflineEarnings(): Promise<void> {
    const gameStore = useGameStore();
    const now = Date.now();
    const lastTickTime = gameStore.getSnapshot().lastTickTime;
    const offlineMs = now - lastTickTime;

    if (offlineMs <= 60000) {
      return; // 离线不足1分钟，忽略
    }

    const offlineSystem = new OfflineSystem();
    const result = offlineSystem.getOfflineEarnings(gameStore.getSnapshot(), offlineMs);

    if (!result.gainedNumber.eq(0)) {
      // 应用离线收益到游戏状态
      const state = gameStore.getSnapshot();
      state.number = BigNumber.from(state.number).add(result.gainedNumber).toDecimal();
      state.totalNumber = BigNumber.from(state.totalNumber).add(result.gainedNumber).toDecimal();

      // 触发 UI 更新
      gameStore.bumpVersion();

      offlineResult.value = markRaw(result);
      showOfflineDialog.value = true;
    }
  }

  /**
   * 启动自动保存
   */
  function startAutoSave(): void {
    stopAutoSave();
    autoSaveTimer = setInterval(() => {
      saveGame();
    }, AUTO_SAVE_INTERVAL_MS);
  }

  /**
   * 停止自动保存
   */
  function stopAutoSave(): void {
    if (autoSaveTimer !== null) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  /**
   * 格式化离线时长
   *
   * @param seconds 秒数
   * @returns 格式化字符串
   */
  function formatOfflineDuration(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}秒`;
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${minutes}分${secs}秒`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分`;
  }

  /**
   * 格式化离线收益
   *
   * @param result 离线收益
   * @returns 格式化字符串
   */
  function formatOfflineGain(result: OfflineResult): string {
    return format(result.gainedNumber);
  }

  /**
   * 读取全部档案馆快照（委托 db，异步；UI 以 loading→loaded 状态呈现）
   *
   * @returns ArchiveRecordDB[]（按时间倒序）
   */
  async function getArchiveRecords(): Promise<ArchiveRecordDB[]> {
    return dbGetArchives();
  }

  return {
    // State
    lastSaveTime,
    isSaving,
    offlineResult,
    showOfflineDialog,

    // Actions
    saveGame,
    loadGame,
    deleteSaveAction,
    checkOfflineAndLoad,
    calculateOfflineEarnings,
    dismissOfflineDialog,
    startAutoSave,
    stopAutoSave,
    formatOfflineDuration,
    formatOfflineGain,
    getArchiveRecords,
  };
});
