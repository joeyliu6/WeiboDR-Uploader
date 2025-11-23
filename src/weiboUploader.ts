// src/weiboUploader.ts
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

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

interface ProgressEvent {
    id: string;
    progress: number;
    total: number;
}

/**
 * 步骤 A: 上传微博（带真实进度）
 * @param filePath 文件路径
 * @param cookie Cookie
 * @param onProgress 进度回调 (0-100)
 */
export async function uploadToWeibo(
  filePath: string, 
  cookie: string,
  onProgress?: (percent: number) => void
): Promise<{ hashName: string; largeUrl: string }> {
  
  // 生成一个临时 ID 用于匹配事件
  const uploadId = `up_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[步骤 A] 开始上传到微博... (ID: ${uploadId})`);

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
    // 1. 设置监听器
    let unlisten: (() => void) | undefined;
    
    if (onProgress) {
        unlisten = await listen<ProgressEvent>('upload://progress', (event) => {
            // 只处理当前任务 ID 的进度
            if (event.payload.id === uploadId) {
                const percent = Math.round((event.payload.progress / event.payload.total) * 100);
                onProgress(percent);
            }
        });
    }

    try {
        // 2. 调用 Rust 命令 (传入 id)
        const response = await invoke<UploadResponse>('upload_file_stream', {
            id: uploadId, // 传入 ID
            filePath,
            weiboCookie: cookie
        });

        const pid = response.pid;
        const hashName = `${pid}.jpg`;
        // 硬编码使用 tvax 和 large
        const largeUrl = `https://tvax1.sinaimg.cn/large/${hashName}`;

        console.log(`[步骤 A] 微博上传成功: ${hashName} (链接: ${largeUrl})`);
        return { hashName, largeUrl };
    } finally {
        // 3. 清理监听器，防止内存泄漏
        if (unlisten) {
            unlisten();
        }
    }

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
