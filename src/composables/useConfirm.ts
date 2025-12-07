// src/composables/useConfirm.ts
// 确认对话框 Composable

import { useConfirm as usePrimeConfirm } from 'primevue/useconfirm';

export interface ConfirmOptions {
  /** 对话框标题 */
  header?: string;

  /** 消息内容 */
  message: string;

  /** 确认按钮文本 */
  acceptLabel?: string;

  /** 取消按钮文本 */
  rejectLabel?: string;

  /** 确认回调 */
  accept?: () => void;

  /** 取消回调 */
  reject?: () => void;

  /** 图标 */
  icon?: string;
}

/**
 * 确认对话框 Composable
 * 封装 PrimeVue ConfirmDialog，提供简化的 API
 */
export function useConfirm() {
  const confirm = usePrimeConfirm();

  /**
   * 显示确认对话框
   * @param options 对话框选项
   */
  const showConfirm = (options: ConfirmOptions) => {
    confirm.require({
      header: options.header || '确认',
      message: options.message,
      icon: options.icon || 'pi pi-exclamation-triangle',
      acceptLabel: options.acceptLabel || '确认',
      rejectLabel: options.rejectLabel || '取消',
      accept: options.accept,
      reject: options.reject
    });
  };

  /**
   * 显示删除确认对话框
   * @param message 消息内容
   * @param onConfirm 确认回调
   */
  const confirmDelete = (message: string, onConfirm: () => void) => {
    confirm.require({
      header: '确认删除',
      message,
      icon: 'pi pi-trash',
      acceptLabel: '删除',
      rejectLabel: '取消',
      acceptClass: 'p-button-danger',
      accept: onConfirm
    });
  };

  /**
   * 显示警告确认对话框
   * @param message 消息内容
   * @param onConfirm 确认回调
   */
  const confirmWarn = (message: string, onConfirm: () => void) => {
    confirm.require({
      header: '警告',
      message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '继续',
      rejectLabel: '取消',
      acceptClass: 'p-button-warning',
      accept: onConfirm
    });
  };

  /**
   * 关闭确认对话框
   */
  const close = () => {
    confirm.close();
  };

  /**
   * 异步确认对话框（返回 Promise）
   * @param message 消息内容
   * @param header 对话框标题
   * @returns Promise<boolean> 用户是否确认
   */
  const confirmAsync = (message: string, header?: string): Promise<boolean> => {
    return new Promise((resolve) => {
      confirm.require({
        header: header || '确认',
        message,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: '确认',
        rejectLabel: '取消',
        accept: () => resolve(true),
        reject: () => resolve(false)
      });
    });
  };

  return {
    showConfirm,
    confirmDelete,
    confirmWarn,
    close,
    confirm: confirmAsync  // 别名，用于 async/await
  };
}
