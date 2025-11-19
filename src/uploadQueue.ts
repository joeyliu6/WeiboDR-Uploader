// src/uploadQueue.ts
/**
 * 上传队列管理器 (Vue 3 Refactor)
 * 负责管理可视化的上传队列UI和上传进度
 */

import { createApp, App } from 'vue';
import UploadQueueVue from './components/UploadQueue.vue';
import type { QueueItem } from './components/UploadQueue.vue';
import { appState } from './main';

/**
 * 上传进度回调类型
 */
export type UploadProgressCallback = (progress: {
  type: 'weibo_progress' | 'r2_progress' | 'weibo_success' | 'r2_success' | 'error' | 'complete';
  payload: any;
}) => void;

/**
 * 上传队列管理器类
 */
export class UploadQueueManager {
  private app: App;
  private vm: any;

  constructor(queueListElementId: string) {
    const el = document.getElementById(queueListElementId);
    if (!el) {
      console.error(`[UploadQueue] 队列列表元素不存在: ${queueListElementId}`);
      throw new Error(`Element #${queueListElementId} not found`);
    }
    
    // Mount Vue App
    this.app = createApp(UploadQueueVue);
    this.vm = this.app.mount(el);
  }

  /**
   * 添加文件到队列
   */
  addFile(filePath: string, fileName: string, uploadToR2: boolean): string {
    const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const item: QueueItem = {
      id,
      fileName, // Vue component doesn't need filePath strictly but we can keep it if we modify QueueItem interface
      uploadToR2,
      weiboProgress: 0,
      r2Progress: 0,
      weiboStatus: '等待中...',
      r2Status: uploadToR2 ? '等待中...' : '已跳过',
      status: 'pending',
    };

    this.vm.addFile(item);
    
    console.log(`[UploadQueue] 添加文件到队列: ${fileName} (ID: ${id})`);
    return id;
  }

  /**
   * 创建进度回调函数
   */
  createProgressCallback(itemId: string): UploadProgressCallback {
    return (progress) => {
      // We get the item from Vue to check current state if needed, but mostly we just push updates
      // Since we can't easily sync read from Vue proxy in this callback structure without reference,
      // we will just dispatch updates to Vue.
      
      const updates: Partial<QueueItem> = {};

      switch (progress.type) {
        case 'weibo_progress':
          updates.weiboProgress = progress.payload;
          updates.weiboStatus = `${progress.payload}%`;
          updates.status = 'uploading';
          break;

        case 'weibo_success':
          updates.weiboProgress = 100;
          updates.weiboStatus = '✓ 完成';
          updates.weiboPid = progress.payload.pid;
          updates.weiboLink = progress.payload.largeUrl;
          updates.baiduLink = progress.payload.baiduLink;
          break;

        case 'r2_progress':
          updates.r2Progress = progress.payload;
          updates.r2Status = `${progress.payload}%`;
          break;

        case 'r2_success':
          updates.r2Progress = 100;
          updates.r2Status = '✓ 完成';
          updates.r2Link = progress.payload.r2Link;
          // [v2.6 优化] 标记 R2 数据已变更
          appState.isR2Dirty = true;
          break;

        case 'error':
          updates.status = 'error';
          updates.errorMessage = progress.payload;
          
          // Helper to decide which part failed
          // We need current state to know which step failed strictly, 
          // but we can infer or just set status.
          // Simplification: Just set error message and Vue component will show it.
          // But to update specific column status:
          // We assume if weiboProgress < 100 it's weibo error
          const currentItem = this.vm.getItem(itemId);
          if (currentItem) {
             if (currentItem.weiboProgress < 100) {
                 updates.weiboStatus = '✗ 失败';
             } else if (currentItem.uploadToR2 && currentItem.r2Progress < 100) {
                 updates.r2Status = '✗ 失败';
             }
          }
          break;

        case 'complete':
          updates.status = 'success';
          break;
      }

      this.vm.updateItem(itemId, updates);
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.vm.clear();
    console.log('[UploadQueue] 队列已清空');
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.vm.count();
  }
}
