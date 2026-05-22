import Dexie, { type Table } from 'dexie';
import type { SaveData } from '@/types/save';

/**
 * 游戏数据库
 *
 * 使用 Dexie 封装 IndexedDB，提供存档的增删查操作。
 */
class GameDatabase extends Dexie {
  /** 存档表 */
  saves!: Table<SaveData, number>;

  constructor() {
    super('InfiniteNumeralDB');
    this.version(1).stores({
      saves: '++id, timestamp',
    });
  }
}

/** 数据库单例 */
const db = new GameDatabase();

/**
 * 保存游戏存档
 *
 * @param data 存档数据
 */
export async function saveGame(data: SaveData): Promise<void> {
  // 清除旧存档（只保留最新一条）
  await db.saves.clear();
  await db.saves.add(data);
}

/**
 * 读取最新存档
 *
 * @returns 存档数据或null（无存档时）
 */
export async function loadGame(): Promise<SaveData | null> {
  const count = await db.saves.count();
  if (count === 0) {
    return null;
  }

  // 获取最新一条（按timestamp降序）
  const latest = await db.saves.orderBy('timestamp').reverse().first();
  return latest ?? null;
}

/**
 * 删除存档
 */
export async function deleteSave(): Promise<void> {
  await db.saves.clear();
}
