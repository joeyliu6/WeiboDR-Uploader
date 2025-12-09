// src/uploaders/tcl/TCLError.ts
// TCL 图床错误处理

import { UploadErrorCode, StructuredError, createStructuredError } from '../base/ErrorTypes';

/**
 * TCL 上传错误类
 */
export class TCLUploadError extends Error {
  constructor(
    message: string,
    public readonly code?: UploadErrorCode,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'TCLUploadError';
  }
}

/**
 * 转换通用错误为 TCL 结构化错误
 */
export function convertToTCLError(error: any): StructuredError {
  const msg = error?.message || String(error);
  const lowerMsg = msg.toLowerCase();

  // 网络错误
  if (lowerMsg.includes('network') || lowerMsg.includes('timeout') || lowerMsg.includes('econnrefused')) {
    return createStructuredError(
      UploadErrorCode.NETWORK_ERROR,
      'TCL 网络错误：无法连接到 TCL 图床服务',
      {
        details: msg,
        retryable: true,
        solution: '请检查网络连接后重试',
        originalError: error,
        serviceId: 'tcl'
      }
    );
  }

  // 限流错误
  if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests') || lowerMsg.includes('429')) {
    return createStructuredError(
      UploadErrorCode.RATE_LIMIT,
      'TCL 限流错误：请求过于频繁',
      {
        details: msg,
        retryable: true,
        solution: '请稍后再试，避免频繁上传',
        originalError: error,
        serviceId: 'tcl'
      }
    );
  }

  // 文件错误
  if (lowerMsg.includes('file') && (lowerMsg.includes('not found') || lowerMsg.includes('无法找到'))) {
    return createStructuredError(
      UploadErrorCode.FILE_NOT_FOUND,
      'TCL 文件错误：文件不存在或无法读取',
      {
        details: msg,
        retryable: false,
        solution: '请确认文件路径正确',
        originalError: error,
        serviceId: 'tcl'
      }
    );
  }

  // 文件过大
  if (lowerMsg.includes('too large') || lowerMsg.includes('size') || lowerMsg.includes('过大')) {
    return createStructuredError(
      UploadErrorCode.FILE_TOO_LARGE,
      'TCL 文件错误：文件过大，超出限制',
      {
        details: msg,
        retryable: false,
        solution: '请压缩图片后重试',
        originalError: error,
        serviceId: 'tcl'
      }
    );
  }

  // 服务器错误
  if (lowerMsg.includes('500') || lowerMsg.includes('502') || lowerMsg.includes('503')) {
    return createStructuredError(
      UploadErrorCode.SERVER_ERROR,
      'TCL 服务器错误：服务暂时不可用',
      {
        details: msg,
        retryable: true,
        solution: '请稍后重试',
        originalError: error,
        serviceId: 'tcl'
      }
    );
  }

  // 通用上传错误
  return createStructuredError(
    UploadErrorCode.UPLOAD_FAILED,
    `TCL 上传失败: ${msg}`,
    {
      details: msg,
      retryable: true,
      originalError: error,
      serviceId: 'tcl'
    }
  );
}
