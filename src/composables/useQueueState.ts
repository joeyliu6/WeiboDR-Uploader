// src/composables/useQueueState.ts
// 全局上传队列状态管理

import { ref, type Ref } from 'vue';
import type { QueueItem } from '../uploadQueue';

// 全局队列状态（单例）
const queueItems: Ref<QueueItem[]> = ref([]);

/**
 * 队列状态管理 Composable
 * 提供全局的队列项管理功能
 */
export function useQueueState() {
  /**
   * 添加队列项
   */
  const addItem = (item: QueueItem) => {
    queueItems.value.push(item);
  };

  /**
   * 获取队列项
   */
  const getItem = (itemId: string): QueueItem | undefined => {
    return queueItems.value.find(item => item.id === itemId);
  };

  /**
   * 更新队列项
   */
  const updateItem = (itemId: string, updates: Partial<QueueItem>) => {
    const index = queueItems.value.findIndex(item => item.id === itemId);
    if (index !== -1) {
      queueItems.value[index] = { ...queueItems.value[index], ...updates };
    }
  };

  /**
   * 删除队列项
   */
  const removeItem = (itemId: string) => {
    const index = queueItems.value.findIndex(item => item.id === itemId);
    if (index !== -1) {
      queueItems.value.splice(index, 1);
    }
  };

  /**
   * 清空队列
   */
  const clearQueue = () => {
    queueItems.value = [];
  };

  return {
    queueItems,
    addItem,
    getItem,
    updateItem,
    removeItem,
    clearQueue
  };
}
