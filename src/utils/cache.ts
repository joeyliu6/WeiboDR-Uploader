// src/utils/cache.ts
// 通用缓存工具类型定义
// 注：createCache 和 createLRUCache 函数已移除（未被使用）

import { type ComputedRef } from 'vue';

/**
 * 缓存配置选项
 */
export interface CacheOptions<T> {
  /** 缓存键名（用于跨窗口同步和日志） */
  key: string;

  /** TTL（毫秒），默认无限 */
  ttl?: number;

  /** 数据加载函数 */
  loader: () => Promise<T>;

  /** 是否启用跨窗口同步，默认 true */
  crossWindowSync?: boolean;
}

/**
 * 缓存实例返回类型
 */
export interface CacheInstance<T> {
  /** 获取缓存数据（如果缓存无效会自动加载） */
  get: (forceRefresh?: boolean) => Promise<T>;
  /** 使缓存失效 */
  invalidate: () => void;
  /** 更新缓存数据（不触发重新加载） */
  update: (updater: (current: T) => T) => void;
  /** 直接设置缓存数据 */
  set: (data: T) => void;
  /** 是否正在加载 */
  isLoading: ComputedRef<boolean>;
  /** 是否有缓存数据 */
  hasData: ComputedRef<boolean>;
  /** 缓存是否有效 */
  isValid: ComputedRef<boolean>;
  /** 数据版本号（每次变化递增） */
  version: ComputedRef<number>;
}

/**
 * LRU 缓存选项
 */
export interface LRUCacheOptions<K, V> {
  /** 缓存键名（用于日志） */
  key: string;
  /** 最大缓存项数 */
  maxSize: number;
  /** 数据加载函数 */
  loader: (itemKey: K) => Promise<V>;
}

/**
 * LRU 缓存实例返回类型
 */
export interface LRUCacheInstance<K, V> {
  /** 获取缓存数据 */
  get: (itemKey: K) => Promise<V>;
  /** 使指定项或全部缓存失效 */
  invalidate: (itemKey?: K) => void;
  /** 获取当前缓存大小 */
  size: () => number;
}
