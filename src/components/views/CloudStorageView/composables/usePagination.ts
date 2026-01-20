// src/components/views/CloudStorageView/composables/usePagination.ts
// 分页状态管理 - 处理 S3 Token-based 分页的缓存策略

import { ref, computed, type Ref, type ComputedRef } from 'vue';

export interface UsePaginationOptions {
  defaultPageSize?: number;
}

export interface UsePaginationReturn {
  currentPage: Ref<number>;
  pageSize: Ref<number>;
  hasMore: Ref<boolean>;
  tokenCache: Ref<Map<number, string | null>>;
  maxKnownPage: ComputedRef<number>;
  pageSizeOptions: number[];

  setPage: (page: number) => void;
  setHasMore: (value: boolean) => void;
  cacheToken: (page: number, token: string | null) => void;
  getToken: (page: number) => string | null | undefined;
  hasToken: (page: number) => boolean;
  findNearestCachedPage: (targetPage: number) => number;
  changePageSize: (size: number) => void;
  reset: () => void;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { defaultPageSize = 50 } = options;

  const currentPage = ref(1);
  const pageSize = ref(defaultPageSize);
  const hasMore = ref(false);
  const pageSizeOptions = [20, 50, 100];

  // Token 缓存：页码 -> 该页所需的 continuationToken
  // 第 1 页的 token 为 null（不需要 token）
  const tokenCache = ref<Map<number, string | null>>(new Map([[1, null]]));

  // 已知的最大页码（基于缓存的 token）
  const maxKnownPage = computed(() => {
    const pages = [...tokenCache.value.keys()];
    const maxCached = pages.length > 0 ? Math.max(...pages) : 1;
    // 如果还有更多数据，已知最大页 = 最大缓存页
    // 如果没有更多数据，当前页就是最后一页
    return hasMore.value ? maxCached : currentPage.value;
  });

  function setPage(page: number) {
    currentPage.value = page;
  }

  function setHasMore(value: boolean) {
    hasMore.value = value;
  }

  function cacheToken(page: number, token: string | null) {
    tokenCache.value.set(page, token);
    // 触发响应式更新
    tokenCache.value = new Map(tokenCache.value);
  }

  function getToken(page: number): string | null | undefined {
    return tokenCache.value.get(page);
  }

  function hasToken(page: number): boolean {
    return tokenCache.value.has(page);
  }

  // 找到最接近目标页且已缓存的页码
  function findNearestCachedPage(targetPage: number): number {
    const cachedPages = [...tokenCache.value.keys()].sort((a, b) => b - a);
    const nearest = cachedPages.find((p) => p < targetPage);
    return nearest ?? 1;
  }

  function changePageSize(size: number) {
    if (!pageSizeOptions.includes(size)) return;
    pageSize.value = size;
    reset();
  }

  function reset() {
    currentPage.value = 1;
    hasMore.value = false;
    tokenCache.value = new Map([[1, null]]);
  }

  return {
    currentPage,
    pageSize,
    hasMore,
    tokenCache,
    maxKnownPage,
    pageSizeOptions,
    setPage,
    setHasMore,
    cacheToken,
    getToken,
    hasToken,
    findNearestCachedPage,
    changePageSize,
    reset,
  };
}
