// src/uploaders/weibo/WeiboError.ts
// 微博上传错误处理

/**
 * 微博上传错误类
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
 * 判断是否为 Cookie 相关错误
 */
export function isCookieError(error: any): boolean {
  if (error instanceof WeiboUploadError) {
    return error.code === 'COOKIE_EXPIRED' || error.code === 'INVALID_COOKIE' || error.code === 'EMPTY_COOKIE';
  }

  const msg = error?.message || String(error);
  return msg.includes('Cookie') || msg.includes('cookie') || msg.includes('100006');
}

/**
 * 转换通用错误为微博错误
 */
export function convertToWeiboError(error: any): WeiboUploadError {
  if (error instanceof WeiboUploadError) {
    return error;
  }

  const msg = error?.message || String(error);

  // Cookie 过期
  if (msg.includes('Cookie expired') || msg.includes('100006')) {
    return new WeiboUploadError(
      'Cookie 已过期：请立即检查并更新 Cookie（错误码：100006）',
      'COOKIE_EXPIRED',
      undefined,
      error
    );
  }

  // 通用上传错误
  return new WeiboUploadError(
    `上传失败: ${msg}`,
    'UPLOAD_ERROR',
    undefined,
    error
  );
}
