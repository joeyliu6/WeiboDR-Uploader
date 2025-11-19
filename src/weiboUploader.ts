// src/weiboUploader.ts
import { invoke } from '@tauri-apps/api/tauri';

/**
 * 自定义错误类，用于微博上传操作
 */
export class WeiboUploadError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly httpStatus?: number,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'WeiboUploadError';
  }
}

/**
 * 验证 Cookie
 * @param cookie Cookie 字符串
 * @throws {WeiboUploadError} 如果 Cookie 无效
 */
function validateCookie(cookie: string): void {
  if (!cookie || typeof cookie !== 'string') {
    throw new WeiboUploadError(
      'Cookie 无效：必须提供有效的 Cookie 字符串',
      'INVALID_COOKIE',
      undefined,
      new Error('Cookie is empty or not a string')
    );
  }

  const trimmedCookie = cookie.trim();
  if (trimmedCookie.length === 0) {
    throw new WeiboUploadError(
      'Cookie 为空：请先在设置中配置微博 Cookie',
      'EMPTY_COOKIE',
      undefined,
      new Error('Cookie is empty after trim')
    );
  }
}

interface UploadResponse {
    pid: string;
    width: number;
    height: number;
    size: number;
}

/**
 * 步骤 A: 上传微博（带重试机制 - 流式上传）
 * @param filePath 文件路径
 * @param cookie 用户的 Cookie 字符串
 * @returns {Promise<{hashName: string, largeUrl: string}>} "主键"
 */
export async function uploadToWeibo(
  filePath: string, 
  cookie: string
): Promise<{ hashName: string; largeUrl: string }> {
  
  console.log(`[步骤 A] 开始上传到微博... (路径: ${filePath})`);

  // 输入验证
  try {
    validateCookie(cookie);
  } catch (error) {
    if (error instanceof WeiboUploadError) {
      throw error;
    }
    throw new WeiboUploadError(
      `输入验证失败: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR',
      undefined,
      error
    );
  }

  try {
      // 调用 Rust 命令进行流式上传
      const response = await invoke<UploadResponse>('upload_file_stream', {
          filePath,
          weiboCookie: cookie
      });

      const pid = response.pid;
      const hashName = `${pid}.jpg`;
      // 硬编码使用 tvax 和 large
      const largeUrl = `https://tvax1.sinaimg.cn/large/${hashName}`;

      console.log(`[步骤 A] 微博上传成功: ${hashName} (链接: ${largeUrl})`);
      return { hashName, largeUrl };

  } catch (error: any) {
      console.error('[步骤 A] 微博上传失败:', error);
      const msg = error.message || String(error);
      
      if (msg.includes('Cookie expired')) {
           throw new WeiboUploadError(
              'Cookie 已过期：请立即检查并更新 Cookie（错误码：100006）',
              'COOKIE_EXPIRED',
              undefined,
              error
            );
      }

      throw new WeiboUploadError(
          `上传失败: ${msg}`,
          'UPLOAD_ERROR',
          undefined,
          error
      );
  }
}
