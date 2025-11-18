// src/uploadQueue.ts
/**
 * 上传队列管理器
 * 负责管理可视化的上传队列UI和上传进度
 */

import { writeText } from '@tauri-apps/api/clipboard';
import { UserConfig } from './config';
import { appState } from './main';

/**
 * 上传进度回调类型
 */
export type UploadProgressCallback = (progress: {
  type: 'weibo_progress' | 'r2_progress' | 'weibo_success' | 'r2_success' | 'error' | 'complete';
  payload: any;
}) => void;

/**
 * 队列项目数据
 */
interface QueueItem {
  id: string;
  filePath: string;
  fileName: string;
  uploadToR2: boolean;
  weiboProgress: number;
  r2Progress: number;
  weiboStatus: string;
  r2Status: string;
  weiboPid?: string;
  weiboLink?: string;
  r2Link?: string;
  baiduLink?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

/**
 * 上传队列管理器类
 */
export class UploadQueueManager {
  private queueListEl: HTMLElement | null;
  private items: Map<string, QueueItem> = new Map();

  constructor(queueListElementId: string) {
    this.queueListEl = document.getElementById(queueListElementId);
    if (!this.queueListEl) {
      console.error(`[UploadQueue] 队列列表元素不存在: ${queueListElementId}`);
    }
  }

  /**
   * 添加文件到队列
   */
  addFile(filePath: string, fileName: string, uploadToR2: boolean): string {
    const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const item: QueueItem = {
      id,
      filePath,
      fileName,
      uploadToR2,
      weiboProgress: 0,
      r2Progress: 0,
      weiboStatus: '等待中...',
      r2Status: uploadToR2 ? '等待中...' : '已跳过',
      status: 'pending',
    };

    this.items.set(id, item);
    this.renderItem(item);
    
    console.log(`[UploadQueue] 添加文件到队列: ${fileName} (ID: ${id})`);
    return id;
  }

  /**
   * 创建进度回调函数
   */
  createProgressCallback(itemId: string): UploadProgressCallback {
    return (progress) => {
      const item = this.items.get(itemId);
      if (!item) {
        console.warn(`[UploadQueue] 队列项不存在: ${itemId}`);
        return;
      }

      switch (progress.type) {
        case 'weibo_progress':
          item.weiboProgress = progress.payload;
          item.weiboStatus = `${progress.payload}%`;
          item.status = 'uploading';
          break;

        case 'weibo_success':
          item.weiboProgress = 100;
          item.weiboStatus = '✓ 完成';
          item.weiboPid = progress.payload.pid;
          item.weiboLink = progress.payload.largeUrl;
          item.baiduLink = progress.payload.baiduLink;
          break;

        case 'r2_progress':
          item.r2Progress = progress.payload;
          item.r2Status = `${progress.payload}%`;
          break;

        case 'r2_success':
          item.r2Progress = 100;
          item.r2Status = '✓ 完成';
          item.r2Link = progress.payload.r2Link;
          // [v2.6 优化] 标记 R2 数据已变更
          appState.isR2Dirty = true;
          break;

        case 'error':
          item.status = 'error';
          item.errorMessage = progress.payload;
          // 判断是哪个步骤失败
          if (item.weiboProgress < 100) {
            item.weiboStatus = '✗ 失败';
          } else if (item.uploadToR2 && item.r2Progress < 100) {
            item.r2Status = '✗ 失败';
          }
          break;

        case 'complete':
          item.status = 'success';
          break;
      }

      this.updateItem(item);
    };
  }

  /**
   * 渲染单个队列项目
   */
  private renderItem(item: QueueItem): void {
    if (!this.queueListEl) return;

    const itemEl = document.createElement('div');
    itemEl.className = 'upload-item';
    itemEl.id = item.id;
    itemEl.setAttribute('data-file-id', item.id);

    // 预览图列
    const previewDiv = document.createElement('div');
    previewDiv.className = 'preview';
    previewDiv.innerHTML = '<span class="loading-icon">⏳</span>';
    itemEl.appendChild(previewDiv);

    // 文件名列
    const filenameDiv = document.createElement('div');
    filenameDiv.className = 'filename';
    filenameDiv.textContent = item.fileName;
    filenameDiv.title = item.fileName;
    itemEl.appendChild(filenameDiv);

    // 进度列
    const progressSection = document.createElement('div');
    progressSection.className = 'progress-section';

    // 微博进度
    const weiboRow = this.createProgressRow('weibo', item.id, '微博:', item.weiboProgress, item.weiboStatus);
    progressSection.appendChild(weiboRow);

    // R2 进度
    const r2Row = this.createProgressRow('r2', item.id, 'R2:', item.r2Progress, item.r2Status);
    progressSection.appendChild(r2Row);

    itemEl.appendChild(progressSection);

    // 操作列
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions';

    const copyWeiboBtn = this.createCopyButton(item.id, 'weibo', '📸 微博', true);
    const copyBaiduBtn = this.createCopyButton(item.id, 'baidu', '🔗 百度', true);
    const copyR2Btn = this.createCopyButton(item.id, 'r2', '☁️ R2', true);

    actionsDiv.appendChild(copyWeiboBtn);
    actionsDiv.appendChild(copyBaiduBtn);
    if (item.uploadToR2) {
      actionsDiv.appendChild(copyR2Btn);
    }

    itemEl.appendChild(actionsDiv);

    // [v2.6 优化] 使用 prepend 将新元素插入到最前面（最新在上）
    this.queueListEl.prepend(itemEl);
    
    // 确保容器滚动条回到顶部，让用户看到最新的上传任务
    this.queueListEl.scrollTop = 0;
  }

  /**
   * 创建进度条行
   */
  private createProgressRow(
    type: 'weibo' | 'r2',
    itemId: string,
    label: string,
    value: number,
    status: string
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'progress-row';

    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const progress = document.createElement('progress');
    progress.id = `${type}-progress-${itemId}`;
    progress.max = 100;
    progress.value = value;
    row.appendChild(progress);

    const statusEl = document.createElement('span');
    statusEl.className = 'status';
    statusEl.id = `${type}-status-${itemId}`;
    statusEl.textContent = status;
    row.appendChild(statusEl);

    return row;
  }

  /**
   * 创建复制按钮
   */
  private createCopyButton(
    itemId: string,
    type: 'weibo' | 'baidu' | 'r2',
    label: string,
    disabled: boolean
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.setAttribute('data-item-id', itemId);
    btn.setAttribute('data-copy-type', type);

    btn.addEventListener('click', async () => {
      const item = this.items.get(itemId);
      if (!item) return;

      let link: string | undefined;
      switch (type) {
        case 'weibo':
          link = item.weiboLink;
          break;
        case 'baidu':
          link = item.baiduLink;
          break;
        case 'r2':
          link = item.r2Link;
          break;
      }

      if (link) {
        try {
          await writeText(link);
          const originalText = btn.textContent;
          btn.textContent = '✓ 已复制';
          btn.classList.add('copied');
          
          setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
          }, 1500);
        } catch (err) {
          console.error('[UploadQueue] 复制失败:', err);
          btn.textContent = '✗ 失败';
          setTimeout(() => {
            btn.textContent = label;
          }, 1500);
        }
      }
    });

    return btn;
  }

  /**
   * 更新队列项目UI
   */
  private updateItem(item: QueueItem): void {
    if (!this.queueListEl) return;

    const itemEl = document.getElementById(item.id);
    if (!itemEl) {
      console.warn(`[UploadQueue] 队列项元素不存在: ${item.id}`);
      return;
    }

    // 更新状态类
    itemEl.className = 'upload-item';
    if (item.status === 'success') {
      itemEl.classList.add('upload-success');
    } else if (item.status === 'error') {
      itemEl.classList.add('upload-error');
    }

    // 更新预览图
    const previewDiv = itemEl.querySelector('.preview');
    if (previewDiv) {
      if (item.status === 'success' && item.weiboPid) {
        // 显示缩略图
        const baiduPrefix = 'https://image.baidu.com/search/down?thumburl=';
        const bmiddleUrl = `https://tvax1.sinaimg.cn/bmiddle/${item.weiboPid}.jpg`;
        previewDiv.innerHTML = `<img src="${baiduPrefix}${bmiddleUrl}" alt="${item.fileName}" onerror="this.style.display='none'" />`;
      } else if (item.status === 'error') {
        previewDiv.innerHTML = '<span class="error-icon">⚠️</span>';
      } else {
        previewDiv.innerHTML = '<span class="loading-icon">⏳</span>';
      }
    }

    // 更新微博进度
    const weiboProgress = itemEl.querySelector(`#weibo-progress-${item.id}`) as HTMLProgressElement;
    if (weiboProgress) {
      weiboProgress.value = item.weiboProgress;
    }

    const weiboStatus = itemEl.querySelector(`#weibo-status-${item.id}`);
    if (weiboStatus) {
      weiboStatus.textContent = item.weiboStatus;
      weiboStatus.className = 'status';
      if (item.weiboStatus.includes('✓')) {
        weiboStatus.classList.add('success');
      } else if (item.weiboStatus.includes('✗')) {
        weiboStatus.classList.add('error');
      }
    }

    // 更新R2进度
    const r2Progress = itemEl.querySelector(`#r2-progress-${item.id}`) as HTMLProgressElement;
    if (r2Progress) {
      r2Progress.value = item.r2Progress;
    }

    const r2Status = itemEl.querySelector(`#r2-status-${item.id}`);
    if (r2Status) {
      r2Status.textContent = item.r2Status;
      r2Status.className = 'status';
      if (item.r2Status.includes('✓')) {
        r2Status.classList.add('success');
      } else if (item.r2Status.includes('✗')) {
        r2Status.classList.add('error');
      } else if (item.r2Status === '已跳过') {
        r2Status.classList.add('skipped');
      }
    }

    // 更新复制按钮状态
    const buttons = itemEl.querySelectorAll('.actions button');
    buttons.forEach((btn) => {
      const button = btn as HTMLButtonElement;
      const copyType = button.getAttribute('data-copy-type');
      
      if (item.status === 'success') {
        if (copyType === 'weibo' && item.weiboLink) {
          button.disabled = false;
        } else if (copyType === 'baidu' && item.baiduLink) {
          button.disabled = false;
        } else if (copyType === 'r2' && item.r2Link) {
          button.disabled = false;
        }
      }
    });
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    if (this.queueListEl) {
      this.queueListEl.innerHTML = '';
    }
    this.items.clear();
    console.log('[UploadQueue] 队列已清空');
  }

  /**
   * 获取队列大小
   */
  getQueueSize(): number {
    return this.items.size;
  }
}

