/**
 * 通用格式化工具函数
 */

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param options.emptyText 0 字节时显示的文本，默认 '0 B'
 */
export function formatFileSize(bytes: number, options?: { emptyText?: string }): string {
  if (bytes === 0) return options?.emptyText ?? '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

