/**
 * 缩略图服务 (精简版)
 *
 * 变更说明：
 * 为了解决大量图片并发生成缩略图导致的 CPU 卡顿和 UI 阻塞问题，
 * 已移除前端 Canvas 生成缩略图的逻辑。
 *
 * 现在此服务仅负责：
 * 1. 提供清理旧缓存的功能 (clearAllCache)
 * 2. 提供统一的接口 (getThumbnailUrl) 但直接返回原图
 * 3. 【内存优化】启动时自动清理 IndexedDB 缓存
 */

const DB_NAME = 'weibodr-thumbnail-cache';
const DB_VERSION = 2;
const STORE_NAME = 'thumbnails';

// 【内存优化】标记是否已执行过启动清理
let hasCleanedOnStartup = false;

/**
 * 打开 IndexedDB 数据库 (仅用于清理缓存)
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * 【内存优化】启动时自动清理 IndexedDB 缓存
 * 由于已移除前端缩略图生成功能，旧缓存数据不再需要
 */
export async function cleanupOnStartup(): Promise<void> {
  if (hasCleanedOnStartup) {
    return;
  }

  hasCleanedOnStartup = true;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 获取缓存条目数量
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count > 0) {
          // 清理所有旧缓存
          const clearRequest = store.clear();
          clearRequest.onerror = () => reject(clearRequest.error);
          clearRequest.onsuccess = () => {
            console.log(`[ThumbnailService] 内存优化: 已清理 ${count} 条旧缓存数据`);
            resolve();
          };
        } else {
          resolve();
        }
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  } catch (error) {
    // 静默处理错误，不影响应用启动
    console.warn('[ThumbnailService] 启动清理失败:', error);
  }
}

/**
 * 获取缩略图 URL
 *
 * @param originalUrl 原图 URL
 * @returns 原图 URL (不再进行压缩)
 */
export async function getThumbnailUrl(originalUrl: string): Promise<string | null> {
  // 【内存优化】首次调用时触发启动清理
  cleanupOnStartup();

  // 直接返回原图 URL，避免前端计算
  return originalUrl;
}

/**
 * 清理所有缓存（IndexedDB）
 * 保留此功能以便用户清理之前版本产生的缓存文件
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        console.log('[ThumbnailService] IndexedDB 缓存已清理');
        resolve();
      };
    });
  } catch (error) {
    console.error('[ThumbnailService] 清理 IndexedDB 失败:', error);
  }
}

