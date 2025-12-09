// src/uploaders/base/ErrorTypes.ts
// 统一的错误码和结构化错误定义

/**
 * 上传错误码枚举
 */
export enum UploadErrorCode {
  // 认证错误 (1xxx)
  COOKIE_EXPIRED = 'COOKIE_EXPIRED',
  COOKIE_INVALID = 'COOKIE_INVALID',
  COOKIE_EMPTY = 'COOKIE_EMPTY',
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // 配置错误 (2xxx)
  CONFIG_MISSING = 'CONFIG_MISSING',
  CONFIG_INVALID = 'CONFIG_INVALID',
  BUCKET_NOT_FOUND = 'BUCKET_NOT_FOUND',
  DOMAIN_INVALID = 'DOMAIN_INVALID',

  // 网络错误 (3xxx)
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // 权限错误 (4xxx)
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // 文件错误 (5xxx)
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_TYPE_INVALID = 'FILE_TYPE_INVALID',

  // 限流错误 (6xxx)
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 通用错误 (9xxx)
  UNKNOWN = 'UNKNOWN',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  SERVER_ERROR = 'SERVER_ERROR'
}

/**
 * 结构化错误接口
 */
export interface StructuredError {
  /** 错误码 */
  code: UploadErrorCode;

  /** 用户友好的错误消息 */
  message: string;

  /** 技术细节（用于日志） */
  details?: string;

  /** 是否可重试 */
  retryable: boolean;

  /** 建议的解决方案 */
  solution?: string;

  /** 原始错误对象 */
  originalError?: any;

  /** 所属图床 */
  serviceId?: string;
}

/**
 * 创建结构化错误
 */
export function createStructuredError(
  code: UploadErrorCode,
  message: string,
  options?: {
    details?: string;
    retryable?: boolean;
    solution?: string;
    originalError?: any;
    serviceId?: string;
  }
): StructuredError {
  return {
    code,
    message,
    details: options?.details,
    retryable: options?.retryable ?? true,
    solution: options?.solution,
    originalError: options?.originalError,
    serviceId: options?.serviceId
  };
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: StructuredError | Error): boolean {
  if ('retryable' in error) {
    return error.retryable;
  }

  // 对于非结构化错误，根据类型判断
  const msg = error.message.toLowerCase();

  // 不可重试的错误
  if (msg.includes('cookie') && msg.includes('过期')) return false;
  if (msg.includes('认证失败')) return false;
  if (msg.includes('权限')) return false;
  if (msg.includes('配置')) return false;

  // 默认可重试
  return true;
}

/**
 * 获取错误的用户友好消息
 */
export function getUserFriendlyMessage(error: StructuredError | Error): string {
  if ('code' in error) {
    return error.message;
  }
  return error.message || '未知错误';
}

/**
 * 获取错误的解决方案建议
 */
export function getErrorSolution(error: StructuredError): string | undefined {
  if (error.solution) return error.solution;

  // 根据错误码提供默认建议
  switch (error.code) {
    case UploadErrorCode.COOKIE_EXPIRED:
    case UploadErrorCode.COOKIE_INVALID:
      return '请前往设置页面更新 Cookie';

    case UploadErrorCode.AUTH_FAILED:
    case UploadErrorCode.ACCESS_DENIED:
      return '请检查配置信息是否正确';

    case UploadErrorCode.NETWORK_ERROR:
    case UploadErrorCode.TIMEOUT:
      return '请检查网络连接后重试';

    case UploadErrorCode.RATE_LIMIT:
      return '请稍后再试，避免频繁上传';

    default:
      return undefined;
  }
}
