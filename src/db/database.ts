import Dexie, { type Table } from 'dexie';
import type { SaveData } from '@/types/save';
import type { ArchiveRecord } from '@/types/game';

/**
 * 游戏数据库
 *
 * 使用 Dexie 封装 IndexedDB，提供存档的增删查操作。
 * 档案馆快照（ArchiveRecord）存储在独立的 `archives` 表，不嵌入主 GameState（对齐 ADR-002 A1）。
 */
class GameDatabase extends Dexie {
  /** 存档表 */
  saves!: Table<SaveData, number>;
  /** 档案馆快照表（独立表，不嵌入 GameState，对齐 ADR-002 A1） */
  archives!: Table<ArchiveRecordDB, number>;

  constructor() {
    super('InfiniteNumeralDB');
    // v1：初始存档表（历史基线）
    this.version(1).stores({
      saves: '++id, timestamp',
    });
    // v2：过渡版本（保持 saves 结构不变，确保 1 → 3 连续，不引入新表）
    this.version(2).stores({
      saves: '++id, timestamp',
    });
    // v3：新增档案馆独立表（对齐 ADR-002 §决策：索引 ++id, runId, endedAt）
    this.version(3).stores({
      saves: '++id, timestamp',
      archives: '++id, runId, endedAt',
    });
  }
}

/** 档案馆表行：ArchiveRecord + Dexie 自增主键 id + 索引别名 endedAt（= 快照 timestamp，用于按时间查询） */
export interface ArchiveRecordDB extends ArchiveRecord {
  /** Dexie 自增主键（写入后由 Dexie 填充，读取时必定存在；供删除/定位使用） */
  id: number;
  /** Dexie 索引别名：= timestamp（本轮结束时间），用于 `archives` 表按时间查询 */
  endedAt: number;
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

/**
 * 写入一条档案馆快照记录（同步追加到 `archives` 独立表）
 *
 * @param record 运行快照（ArchiveRecord）
 */
export async function addArchiveRecord(record: ArchiveRecord): Promise<void> {
  // endedAt 为 Dexie 索引别名，= 快照 timestamp（本轮结束时间）
  // id 由 Dexie 自增填充，写入时无需提供（此处做强转以满足 ArchiveRecordDB 类型）
  const row = { ...record, endedAt: record.timestamp } as ArchiveRecordDB;
  await db.archives.add(row);
}

/**
 * 读取全部档案馆快照（按时间倒序：最新在前）
 *
 * @returns ArchiveRecordDB[]（含 Dexie 内部 id，供删除使用；同时满足 ArchiveRecord 结构）
 */
export async function getArchiveRecords(): Promise<ArchiveRecordDB[]> {
  // endedAt 是索引别名（= timestamp），按它排序等价于按时间倒序
  const rows = await db.archives.orderBy('endedAt').reverse().toArray();
  return rows;
}

/**
 * 按内部 id 删除一条档案馆快照
 *
 * @param id Dexie 自增 id
 */
export async function deleteArchiveRecord(id: number): Promise<void> {
  await db.archives.delete(id);
}

/**
 * 清空全部档案馆快照（仅用于测试/重置）
 */
export async function clearArchives(): Promise<void> {
  await db.archives.clear();
}
