/**
 * 分片历史记录存储服务
 *
 * 【性能优化】将历史记录按季度分片存储，解决大数据量下的读写性能问题：
 * - 新增记录只写入当前季度的小文件
 * - 查询时按需加载对应分片
 * - 支持 100 万条以上的历史记录
 *
 * 存储结构：
 * .history/
 * ├── index.dat          # 索引文件（ID 映射、分片元数据）
 * ├── 2024-Q4.dat         # 2024 年第 4 季度数据
 * ├── 2025-Q1.dat         # 2025 年第 1 季度数据
 * └── 2025-Q2.dat         # 当前季度（最活跃）
 */

import { readTextFile, writeTextFile, exists, createDir, readDir, removeFile } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { secureStorage } from '../crypto';
import type { HistoryItem } from '../config/types';

// === 配置 ===
const HISTORY_DIR = '.history';
const INDEX_FILE = 'index.dat';
// 每个分片最多 5000 条记录（预留用于自动分片）
// const SHARD_SIZE_LIMIT = 5000;

// === 类型定义 ===
interface ShardMeta {
  key: string;           // 分片键，如 "2025-Q1"
  count: number;         // 记录数量
  minTimestamp: number;  // 最早时间戳
  maxTimestamp: number;  // 最晚时间戳
}

interface HistoryIndex {
  version: number;       // 索引版本
  totalCount: number;    // 总记录数
  shards: ShardMeta[];   // 分片元数据列表
  // 轻量级搜索索引：ID -> { shardKey, fileName }
  itemIndex: Record<string, { shardKey: string; fileName: string }>;
}

// === 工具函数 ===

/**
 * 获取时间戳对应的分片键（按季度）
 */
function getShardKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * 获取历史记录目录路径
 */
async function getHistoryDir(): Promise<string> {
  const appDir = await appDataDir();
  return join(appDir, HISTORY_DIR);
}

/**
 * 确保历史记录目录存在
 */
async function ensureHistoryDir(): Promise<void> {
  const historyDir = await getHistoryDir();
  try {
    await createDir(historyDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在，忽略错误
  }
}

/**
 * 加密并保存 JSON 数据
 */
async function saveEncryptedJson(filePath: string, data: any): Promise<void> {
  const jsonContent = JSON.stringify(data, null, 2);
  const encryptedContent = await secureStorage.encrypt(jsonContent);
  await writeTextFile(filePath, encryptedContent);
}

/**
 * 读取并解密 JSON 数据
 */
async function readEncryptedJson<T>(filePath: string): Promise<T | null> {
  try {
    if (!await exists(filePath)) {
      return null;
    }

    const content = await readTextFile(filePath);
    if (!content || content.trim().length === 0) {
      return null;
    }

    // 尝试解密
    let decryptedContent = content;
    if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
      decryptedContent = await secureStorage.decrypt(content);
    }

    return JSON.parse(decryptedContent) as T;
  } catch (error) {
    console.warn('[ShardedHistoryStore] 读取文件失败:', filePath, error);
    return null;
  }
}

// === 分片存储类 ===

class ShardedHistoryStore {
  private indexCache: HistoryIndex | null = null;
  private shardCache: Map<string, HistoryItem[]> = new Map();

  /**
   * 初始化存储（确保目录和索引文件存在）
   */
  async init(): Promise<void> {
    await ensureHistoryDir();
    await this.loadIndex();
  }

  /**
   * 加载索引文件
   */
  private async loadIndex(): Promise<HistoryIndex> {
    if (this.indexCache) {
      return this.indexCache;
    }

    const historyDir = await getHistoryDir();
    const indexPath = await join(historyDir, INDEX_FILE);

    const index = await readEncryptedJson<HistoryIndex>(indexPath);
    if (index) {
      this.indexCache = index;
      return index;
    }

    // 创建新索引
    const newIndex: HistoryIndex = {
      version: 1,
      totalCount: 0,
      shards: [],
      itemIndex: {}
    };
    this.indexCache = newIndex;
    return newIndex;
  }

  /**
   * 保存索引文件
   */
  private async saveIndex(): Promise<void> {
    if (!this.indexCache) return;

    const historyDir = await getHistoryDir();
    const indexPath = await join(historyDir, INDEX_FILE);
    await saveEncryptedJson(indexPath, this.indexCache);
  }

  /**
   * 加载指定分片的数据
   */
  private async loadShard(shardKey: string): Promise<HistoryItem[]> {
    // 检查缓存
    if (this.shardCache.has(shardKey)) {
      return this.shardCache.get(shardKey)!;
    }

    const historyDir = await getHistoryDir();
    const shardPath = await join(historyDir, `${shardKey}.dat`);

    const items = await readEncryptedJson<HistoryItem[]>(shardPath);
    const shardData = items || [];

    // 缓存分片数据
    this.shardCache.set(shardKey, shardData);
    return shardData;
  }

  /**
   * 保存分片数据
   */
  private async saveShard(shardKey: string, items: HistoryItem[]): Promise<void> {
    const historyDir = await getHistoryDir();
    const shardPath = await join(historyDir, `${shardKey}.dat`);
    await saveEncryptedJson(shardPath, items);

    // 更新缓存
    this.shardCache.set(shardKey, items);
  }

  /**
   * 添加新的历史记录项
   */
  async addItem(item: HistoryItem): Promise<void> {
    const index = await this.loadIndex();
    const shardKey = getShardKey(item.timestamp);

    // 加载分片
    const shardItems = await this.loadShard(shardKey);

    // 添加到分片开头
    shardItems.unshift(item);

    // 保存分片
    await this.saveShard(shardKey, shardItems);

    // 更新索引
    index.totalCount++;
    index.itemIndex[item.id] = {
      shardKey,
      fileName: item.localFileName
    };

    // 更新分片元数据
    let shardMeta = index.shards.find(s => s.key === shardKey);
    if (!shardMeta) {
      shardMeta = {
        key: shardKey,
        count: 0,
        minTimestamp: item.timestamp,
        maxTimestamp: item.timestamp
      };
      index.shards.push(shardMeta);
    }
    shardMeta.count++;
    shardMeta.minTimestamp = Math.min(shardMeta.minTimestamp, item.timestamp);
    shardMeta.maxTimestamp = Math.max(shardMeta.maxTimestamp, item.timestamp);

    // 保存索引
    await this.saveIndex();
  }

  /**
   * 删除历史记录项
   */
  async deleteItem(itemId: string): Promise<boolean> {
    const index = await this.loadIndex();
    const itemInfo = index.itemIndex[itemId];

    if (!itemInfo) {
      return false;
    }

    // 加载分片
    const shardItems = await this.loadShard(itemInfo.shardKey);
    const itemIndex = shardItems.findIndex(item => item.id === itemId);

    if (itemIndex === -1) {
      return false;
    }

    // 删除项目
    shardItems.splice(itemIndex, 1);

    // 保存分片
    await this.saveShard(itemInfo.shardKey, shardItems);

    // 更新索引
    index.totalCount--;
    delete index.itemIndex[itemId];

    // 更新分片元数据
    const shardMeta = index.shards.find(s => s.key === itemInfo.shardKey);
    if (shardMeta) {
      shardMeta.count--;
      if (shardMeta.count === 0) {
        // 删除空分片
        const shardIndex = index.shards.indexOf(shardMeta);
        index.shards.splice(shardIndex, 1);
      }
    }

    await this.saveIndex();
    return true;
  }

  /**
   * 批量删除历史记录项
   */
  async deleteItems(itemIds: string[]): Promise<number> {
    let deletedCount = 0;

    // 按分片分组
    const index = await this.loadIndex();
    const shardGroups = new Map<string, string[]>();

    for (const itemId of itemIds) {
      const itemInfo = index.itemIndex[itemId];
      if (itemInfo) {
        const group = shardGroups.get(itemInfo.shardKey) || [];
        group.push(itemId);
        shardGroups.set(itemInfo.shardKey, group);
      }
    }

    // 按分片批量删除
    for (const [shardKey, ids] of shardGroups) {
      const shardItems = await this.loadShard(shardKey);
      const idsSet = new Set(ids);
      const filteredItems = shardItems.filter(item => !idsSet.has(item.id));
      const deleted = shardItems.length - filteredItems.length;

      if (deleted > 0) {
        await this.saveShard(shardKey, filteredItems);
        deletedCount += deleted;

        // 更新索引
        for (const id of ids) {
          delete index.itemIndex[id];
        }

        // 更新分片元数据
        const shardMeta = index.shards.find(s => s.key === shardKey);
        if (shardMeta) {
          shardMeta.count -= deleted;
          if (shardMeta.count === 0) {
            const shardIndex = index.shards.indexOf(shardMeta);
            index.shards.splice(shardIndex, 1);
          }
        }
      }
    }

    index.totalCount -= deletedCount;
    await this.saveIndex();

    return deletedCount;
  }

  /**
   * 获取所有历史记录（分页）
   */
  async getItems(page: number = 1, pageSize: number = 500): Promise<{
    items: HistoryItem[];
    total: number;
    hasMore: boolean;
  }> {
    const index = await this.loadIndex();

    // 按时间排序分片
    const sortedShards = [...index.shards].sort(
      (a, b) => b.maxTimestamp - a.maxTimestamp
    );

    const allItems: HistoryItem[] = [];
    const skip = (page - 1) * pageSize;
    let skipped = 0;

    for (const shardMeta of sortedShards) {
      if (allItems.length >= pageSize) break;

      const shardItems = await this.loadShard(shardMeta.key);
      // 按时间排序
      const sortedItems = shardItems.sort((a, b) => b.timestamp - a.timestamp);

      for (const item of sortedItems) {
        if (skipped < skip) {
          skipped++;
          continue;
        }
        if (allItems.length >= pageSize) break;
        allItems.push(item);
      }
    }

    return {
      items: allItems,
      total: index.totalCount,
      hasMore: skip + allItems.length < index.totalCount
    };
  }

  /**
   * 获取所有历史记录（用于导出或迁移）
   */
  async getAllItems(): Promise<HistoryItem[]> {
    const index = await this.loadIndex();
    const allItems: HistoryItem[] = [];

    for (const shardMeta of index.shards) {
      const shardItems = await this.loadShard(shardMeta.key);
      allItems.push(...shardItems);
    }

    // 按时间排序
    return allItems.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 清空所有历史记录
   */
  async clear(): Promise<void> {
    const historyDir = await getHistoryDir();

    // 删除所有分片文件
    try {
      const entries = await readDir(historyDir);
      for (const entry of entries) {
        if (entry.name?.endsWith('.dat')) {
          const filePath = await join(historyDir, entry.name);
          await removeFile(filePath);
        }
      }
    } catch (error) {
      console.warn('[ShardedHistoryStore] 清理文件失败:', error);
    }

    // 重置索引
    this.indexCache = {
      version: 1,
      totalCount: 0,
      shards: [],
      itemIndex: {}
    };
    await this.saveIndex();

    // 清空缓存
    this.shardCache.clear();
  }

  /**
   * 从旧格式迁移数据
   */
  async migrateFromLegacy(items: HistoryItem[]): Promise<void> {
    console.log(`[ShardedHistoryStore] 开始迁移 ${items.length} 条记录...`);

    // 按分片分组
    const shardGroups = new Map<string, HistoryItem[]>();
    for (const item of items) {
      const shardKey = getShardKey(item.timestamp);
      const group = shardGroups.get(shardKey) || [];
      group.push(item);
      shardGroups.set(shardKey, group);
    }

    // 初始化索引
    const index: HistoryIndex = {
      version: 1,
      totalCount: items.length,
      shards: [],
      itemIndex: {}
    };

    // 保存每个分片
    for (const [shardKey, shardItems] of shardGroups) {
      // 按时间排序
      const sortedItems = shardItems.sort((a, b) => b.timestamp - a.timestamp);

      // 保存分片
      await this.saveShard(shardKey, sortedItems);

      // 更新索引
      const timestamps = sortedItems.map(item => item.timestamp);
      index.shards.push({
        key: shardKey,
        count: sortedItems.length,
        minTimestamp: Math.min(...timestamps),
        maxTimestamp: Math.max(...timestamps)
      });

      for (const item of sortedItems) {
        index.itemIndex[item.id] = {
          shardKey,
          fileName: item.localFileName
        };
      }
    }

    // 保存索引
    this.indexCache = index;
    await this.saveIndex();

    console.log(`[ShardedHistoryStore] 迁移完成: ${shardGroups.size} 个分片`);
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    totalCount: number;
    shardCount: number;
    shards: ShardMeta[];
  }> {
    const index = await this.loadIndex();
    return {
      totalCount: index.totalCount,
      shardCount: index.shards.length,
      shards: index.shards
    };
  }

  /**
   * 使缓存失效
   */
  invalidateCache(): void {
    this.indexCache = null;
    this.shardCache.clear();
  }
}

// 导出单例实例
export const shardedHistoryStore = new ShardedHistoryStore();
