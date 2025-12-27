/**
 * 文件名处理工具
 *
 * 提供文件名规范化、特殊字符处理、安全验证等功能
 */

/** 允许的图片扩展名 */
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] as const;

/** 扩展名类型 */
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number];

/** Windows 文件名非法字符 */
const WINDOWS_ILLEGAL_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/**
 * 规范化文件名
 *
 * 处理以下情况：
 * 1. 移除 Windows 非法字符
 * 2. 防止隐藏文件（以点开头）
 * 3. 处理空文件名
 *
 * @param fileName - 原始文件名
 * @returns 规范化后的安全文件名
 *
 * @example
 * ```typescript
 * sanitizeFileName('test<>file.png')  // 'test__file.png'
 * sanitizeFileName('.hidden.png')     // '_hidden.png'
 * sanitizeFileName('')                // 'unnamed'
 * ```
 */
export function sanitizeFileName(fileName: string): string {
  // 1. 移除或替换危险字符
  const sanitized = fileName
    .replace(WINDOWS_ILLEGAL_CHARS, '_')  // Windows 非法字符替换为下划线
    .replace(/^\.+/, '_')                  // 防止隐藏文件（以点开头）
    .replace(/\.+$/, '')                   // 移除尾部多余的点号
    .trim();

  // 2. 处理空文件名
  return sanitized || 'unnamed';
}

/**
 * 获取文件扩展名（小写）
 *
 * @param fileName - 文件名
 * @returns 小写的扩展名，不包含点号
 *
 * @example
 * ```typescript
 * getExtension('image.PNG')  // 'png'
 * getExtension('file')       // ''
 * ```
 */
export function getExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return '';
  }
  return fileName.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * 获取安全的扩展名
 *
 * 如果扩展名不在允许列表中，返回默认值 'png'
 *
 * @param fileName - 文件名
 * @returns 安全的扩展名
 */
export function getSafeExtension(fileName: string): AllowedExtension {
  const ext = getExtension(fileName);
  return isAllowedExtension(ext) ? ext : 'png';
}

/**
 * 检查扩展名是否在允许列表中
 *
 * @param ext - 扩展名（不含点号，小写）
 * @returns 是否允许
 */
export function isAllowedExtension(ext: string): ext is AllowedExtension {
  return ALLOWED_EXTENSIONS.includes(ext as AllowedExtension);
}

/**
 * 验证文件名是否安全
 *
 * @param fileName - 文件名
 * @returns 验证结果
 */
export function validateFileName(fileName: string): {
  valid: boolean;
  error?: string;
  sanitized?: string;
} {
  if (!fileName || fileName.trim().length === 0) {
    return { valid: false, error: '文件名不能为空' };
  }

  // 检查扩展名
  const ext = getExtension(fileName);
  if (!ext) {
    return { valid: false, error: '文件缺少扩展名' };
  }

  if (!isAllowedExtension(ext)) {
    return {
      valid: false,
      error: `不支持的文件格式: ${ext}，仅支持 ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // 检查是否需要规范化
  const sanitized = sanitizeFileName(fileName);
  if (sanitized !== fileName) {
    return {
      valid: true,
      sanitized,
      error: `文件名已规范化: ${fileName} → ${sanitized}`
    };
  }

  return { valid: true };
}

/**
 * 生成唯一文件名
 *
 * 在文件名后添加时间戳，确保唯一性
 *
 * @param fileName - 原始文件名
 * @returns 带时间戳的唯一文件名
 *
 * @example
 * ```typescript
 * generateUniqueFileName('image.png')  // 'image_1703683200000.png'
 * ```
 */
export function generateUniqueFileName(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  const ext = getExtension(sanitized);
  const nameWithoutExt = ext ? sanitized.slice(0, -(ext.length + 1)) : sanitized;
  const timestamp = Date.now();

  return ext
    ? `${nameWithoutExt}_${timestamp}.${ext}`
    : `${nameWithoutExt}_${timestamp}`;
}

/**
 * 从 URL 中提取文件名
 *
 * @param url - 文件 URL
 * @returns 提取的文件名，如果无法提取则返回 undefined
 */
export function extractFileNameFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment.includes('.')) {
      return decodeURIComponent(lastSegment);
    }

    return undefined;
  } catch {
    return undefined;
  }
}
