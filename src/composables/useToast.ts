// src/composables/useToast.ts
// Toast 通知 Composable

import { useToast as usePrimeToast } from 'primevue/usetoast';

/**
 * Toast 通知 Composable
 * 封装 PrimeVue Toast 服务，提供简化的 API
 */
export function useToast() {
  const toast = usePrimeToast();

  /**
   * 显示成功通知
   * @param summary 标题
   * @param detail 详细信息（可选）
   * @param life 显示时长（毫秒），默认 3000
   */
  const success = (summary: string, detail?: string, life = 3000) => {
    toast.add({
      severity: 'success',
      summary,
      detail,
      life
    });
  };

  /**
   * 显示错误通知
   * @param summary 标题
   * @param detail 详细信息（可选）
   * @param life 显示时长（毫秒），默认 5000
   */
  const error = (summary: string, detail?: string, life = 5000) => {
    toast.add({
      severity: 'error',
      summary,
      detail,
      life
    });
  };

  /**
   * 显示警告通知
   * @param summary 标题
   * @param detail 详细信息（可选）
   * @param life 显示时长（毫秒），默认 4000
   */
  const warn = (summary: string, detail?: string, life = 4000) => {
    toast.add({
      severity: 'warn',
      summary,
      detail,
      life
    });
  };

  /**
   * 显示信息通知
   * @param summary 标题
   * @param detail 详细信息（可选）
   * @param life 显示时长（毫秒），默认 3000
   */
  const info = (summary: string, detail?: string, life = 3000) => {
    toast.add({
      severity: 'info',
      summary,
      detail,
      life
    });
  };

  /**
   * 显示自定义通知
   * @param severity 严重程度
   * @param summary 标题
   * @param detail 详细信息（可选）
   * @param life 显示时长（毫秒），默认 3000
   */
  const show = (
    severity: 'success' | 'info' | 'warn' | 'error',
    summary: string,
    detail?: string,
    life = 3000
  ) => {
    toast.add({
      severity,
      summary,
      detail,
      life
    });
  };

  /**
   * 清除所有通知
   */
  const clear = () => {
    toast.removeAllGroups();
  };

  return {
    success,
    error,
    warn,
    info,
    show,
    clear
  };
}
