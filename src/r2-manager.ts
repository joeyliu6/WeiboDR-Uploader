// src/r2-manager.ts
// R2 存储管理视图逻辑

import { invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { writeText } from '@tauri-apps/api/clipboard';
import { UserConfig, R2Config } from './config';
import { appState } from './main';

/**
 * R2 对象接口（与 Rust 结构体匹配）
 */
interface R2Object {
  key: string;
  size: number;
  lastModified: string;
}

/**
 * R2 管理器类
 */
export class R2Manager {
  private config: UserConfig;
  private objects: R2Object[] = [];
  private currentModalObject: R2Object | null = null;

  // DOM 元素
  private gridContainer: HTMLElement;
  private loadingEl: HTMLElement;
  private errorMessageEl: HTMLElement;
  private bucketInfoEl: HTMLElement;
  private statsInfoEl: HTMLElement;
  private refreshBtn: HTMLButtonElement;
  private modal: HTMLElement;
  private modalImage: HTMLImageElement;
  private modalFilename: HTMLElement;
  private modalFilesize: HTMLElement;
  private modalCopyBtn: HTMLButtonElement;
  private modalDeleteBtn: HTMLButtonElement;
  private modalCloseBtn: HTMLButtonElement;

  constructor(config: UserConfig) {
    this.config = config;

    // 获取 DOM 元素
    this.gridContainer = this.getElement('r2-grid-container');
    this.loadingEl = this.getElement('r2-loading');
    this.errorMessageEl = this.getElement('r2-error-message');
    this.bucketInfoEl = this.getElement('r2-bucket-info');
    this.statsInfoEl = this.getElement('r2-stats-info');
    this.refreshBtn = this.getElement('r2-refresh-btn') as HTMLButtonElement;
    this.modal = this.getElement('r2-modal');
    this.modalImage = this.getElement('r2-modal-image') as HTMLImageElement;
    this.modalFilename = this.getElement('r2-modal-filename');
    this.modalFilesize = this.getElement('r2-modal-filesize');
    this.modalCopyBtn = this.getElement('r2-modal-copy-btn') as HTMLButtonElement;
    this.modalDeleteBtn = this.getElement('r2-modal-delete-btn') as HTMLButtonElement;
    this.modalCloseBtn = this.getElement('r2-modal-close-btn') as HTMLButtonElement;

    this.initEventListeners();
  }

  /**
   * 获取 DOM 元素，带错误检查
   */
  private getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`[R2管理] 找不到元素: ${id}`);
    }
    return element as T;
  }

  /**
   * 初始化事件监听器
   */
  private initEventListeners(): void {
    // 刷新按钮
    this.refreshBtn.addEventListener('click', () => {
      // [v2.6 优化] 用户手动刷新，标记为脏数据
      appState.isR2Dirty = true;
      this.loadObjects();
    });

    // 模态框关闭按钮
    this.modalCloseBtn.addEventListener('click', () => {
      this.closeModal();
    });

    // 点击模态框背景关闭
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal || (e.target as HTMLElement).classList.contains('r2-modal-overlay')) {
        this.closeModal();
      }
    });

    // 复制链接按钮
    this.modalCopyBtn.addEventListener('click', () => {
      this.copyCurrentObjectLink();
    });

    // 删除按钮
    this.modalDeleteBtn.addEventListener('click', () => {
      this.deleteCurrentObject();
    });

    // ESC 键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'flex') {
        this.closeModal();
      }
    });
  }

  /**
   * 更新配置
   */
  public updateConfig(config: UserConfig): void {
    this.config = config;
  }

  /**
   * 加载 R2 对象列表
   */
  public async loadObjects(): Promise<void> {
    try {
      console.log('[R2管理] 开始加载对象列表');

      // 检查配置
      if (!this.isR2Configured()) {
        this.showError('请先在"设置"中完整配置 R2 并提供"公开访问域名"。');
        return;
      }

      // 显示加载状态
      this.showLoading(true);
      this.hideError();
      this.clearGrid();

      // 更新存储桶信息
      this.bucketInfoEl.textContent = `存储桶: ${this.config.r2.bucketName}`;

      // 调用 Rust 命令获取对象列表
      this.objects = await invoke<R2Object[]>('list_r2_objects', {
        config: this.config.r2,
      });

      console.log(`[R2管理] 成功获取 ${this.objects.length} 个对象`);

      // 显示统计信息
      const totalSize = this.objects.reduce((sum, obj) => sum + obj.size, 0);
      this.statsInfoEl.textContent = `共 ${this.objects.length} 个项目，${this.formatFileSize(totalSize)}`;

      // 渲染网格
      this.renderGrid();

      this.showLoading(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[R2管理] 加载对象失败:', error);
      this.showError(`加载失败: ${errorMsg}`);
      this.showLoading(false);
    }
  }

  /**
   * 检查 R2 是否已配置
   */
  private isR2Configured(): boolean {
    const r2 = this.config.r2;
    return !!(
      r2.accountId &&
      r2.accessKeyId &&
      r2.secretAccessKey &&
      r2.bucketName &&
      r2.publicDomain
    );
  }

  /**
   * 渲染网格
   */
  private renderGrid(): void {
    this.clearGrid();

    if (this.objects.length === 0) {
      this.gridContainer.innerHTML = '<div class="r2-empty-message">暂无图片</div>';
      return;
    }

    this.objects.forEach((obj) => {
      const item = this.createGridItem(obj);
      this.gridContainer.appendChild(item);
    });
  }

  /**
   * 创建网格项
   */
  private createGridItem(obj: R2Object): HTMLElement {
    const item = document.createElement('div');
    item.className = 'r2-item';

    // 1. Image
    const img = document.createElement('img');
    img.src = this.buildImageUrl(obj.key);
    img.className = 'r2-item-img';
    img.loading = 'lazy';
    img.alt = obj.key;

    // 2. Overlay
    const overlay = document.createElement('div');
    overlay.className = 'r2-item-overlay';

    // 2.1 Filename
    const nameSpan = document.createElement('span');
    nameSpan.className = 'r2-item-name';
    nameSpan.textContent = obj.key;
    nameSpan.title = obj.key;

    // 2.2 Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'r2-item-delete';
    deleteBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    deleteBtn.title = '删除';

    // Events
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteObject(obj);
    };

    item.onclick = () => {
      this.openModal(obj);
    };

    // Assemble
    overlay.appendChild(nameSpan);
    overlay.appendChild(deleteBtn);
    item.appendChild(img);
    item.appendChild(overlay);

    return item;
  }

  /**
   * 构建图片 URL
   */
  private buildImageUrl(key: string): string {
    const domain = this.config.r2.publicDomain.replace(/\/$/, ''); // 移除末尾的斜杠
    return `${domain}/${key}`;
  }

  /**
   * 打开模态框
   */
  private openModal(obj: R2Object): void {
    this.currentModalObject = obj;
    const imageUrl = this.buildImageUrl(obj.key);

    this.modalImage.src = imageUrl;
    this.modalFilename.textContent = `文件名: ${obj.key}`;
    this.modalFilesize.textContent = `大小: ${this.formatFileSize(obj.size)}`;

    this.modal.style.display = 'flex';
  }

  /**
   * 关闭模态框
   */
  private closeModal(): void {
    this.modal.style.display = 'none';
    this.currentModalObject = null;
  }

  /**
   * 复制当前对象的链接
   */
  private async copyCurrentObjectLink(): Promise<void> {
    if (!this.currentModalObject) return;

    try {
      const url = this.buildImageUrl(this.currentModalObject.key);
      await writeText(url);
      this.showTemporaryMessage('✓ 链接已复制到剪贴板');
    } catch (error) {
      console.error('[R2管理] 复制链接失败:', error);
      this.showTemporaryMessage('✗ 复制失败', 'error');
    }
  }

  /**
   * 删除当前模态框中的对象
   */
  private async deleteCurrentObject(): Promise<void> {
    if (!this.currentModalObject) return;
    await this.deleteObject(this.currentModalObject);
    this.closeModal();
  }

  /**
   * 删除对象
   */
  private async deleteObject(obj: R2Object): Promise<void> {
    try {
      // 确认对话框
      const confirmed = await dialog.confirm(
        `您确定要从 R2 永久删除 "${obj.key}" 吗？\n\n此操作不可撤销。`,
        { title: '确认删除', type: 'warning' }
      );

      if (!confirmed) {
        return;
      }

      console.log(`[R2管理] 开始删除对象: ${obj.key}`);

      // 调用 Rust 命令删除对象
      const result = await invoke<string>('delete_r2_object', {
        config: this.config.r2,
        key: obj.key,
      });

      console.log(`[R2管理] ${result}`);

      // 从列表中移除
      this.objects = this.objects.filter((o) => o.key !== obj.key);

      // 重新渲染网格
      this.renderGrid();

      // 更新统计信息
      const totalSize = this.objects.reduce((sum, o) => sum + o.size, 0);
      this.statsInfoEl.textContent = `共 ${this.objects.length} 个项目，${this.formatFileSize(totalSize)}`;

      this.showTemporaryMessage('✓ 删除成功');
      
      // [v2.6 优化] 删除后 DOM 已同步，不需要标记脏数据
      // appState.isR2Dirty = false; // 保持缓存有效
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[R2管理] 删除对象失败:', error);
      this.showTemporaryMessage(`✗ 删除失败: ${errorMsg}`, 'error');
    }
  }

  /**
   * 显示/隐藏加载状态
   */
  private showLoading(show: boolean): void {
    this.loadingEl.style.display = show ? 'flex' : 'none';
  }

  /**
   * 显示错误消息
   */
  private showError(message: string): void {
    this.errorMessageEl.textContent = message;
    this.errorMessageEl.style.display = 'block';
  }

  /**
   * 隐藏错误消息
   */
  private hideError(): void {
    this.errorMessageEl.style.display = 'none';
  }

  /**
   * 清空网格
   */
  private clearGrid(): void {
    this.gridContainer.innerHTML = '';
  }

  /**
   * 显示临时消息（toast）
   */
  private showTemporaryMessage(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div');
    toast.className = `r2-toast r2-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // 淡入动画
    setTimeout(() => {
      toast.classList.add('r2-toast-show');
    }, 10);

    // 3秒后移除
    setTimeout(() => {
      toast.classList.remove('r2-toast-show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

