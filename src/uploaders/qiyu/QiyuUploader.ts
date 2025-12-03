// src/uploaders/qiyu/QiyuUploader.ts
// 七鱼图床上传器
// 基于网易七鱼客服系统的 NOS 对象存储

import { BaseUploader } from '../base/BaseUploader';
import { UploadResult, ValidationResult, UploadOptions, ProgressCallback } from '../base/types';
import { QiyuServiceConfig } from '../../config/types';

interface QiyuRustResult {
  url: string;
  size: number;
}

export class QiyuUploader extends BaseUploader {
  readonly serviceId = 'qiyu';
  readonly serviceName = '七鱼图床';

  protected getRustCommand(): string {
    return 'upload_to_qiyu';
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    const qiyuConfig = config as QiyuServiceConfig;

    if (!qiyuConfig.token || this.isEmpty(qiyuConfig.token)) {
      return {
        valid: false,
        missingFields: ['Token'],
        errors: ['请先在设置中配置七鱼 Token']
      };
    }

    // 验证 Token 格式
    if (!qiyuConfig.token.trim().startsWith('UPLOAD ')) {
      return {
        valid: false,
        errors: ['Token 格式错误，应以 "UPLOAD " 开头']
      };
    }

    // 验证 Token 结构 (UPLOAD AccessKey:Signature:Policy)
    const tokenParts = qiyuConfig.token.trim().split(' ');
    if (tokenParts.length !== 2) {
      return {
        valid: false,
        errors: ['Token 格式错误']
      };
    }

    const credentialParts = tokenParts[1].split(':');
    if (credentialParts.length !== 3) {
      return {
        valid: false,
        errors: ['Token 格式错误，应包含 AccessKey:Signature:Policy']
      };
    }

    return { valid: true };
  }

  async upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    const config = options.config as QiyuServiceConfig;

    const rustResult = await this.uploadViaRust(
      filePath,
      { qiyuToken: config.token },
      onProgress
    ) as QiyuRustResult;

    return {
      serviceId: 'qiyu',
      fileKey: rustResult.url,
      url: rustResult.url,
      size: rustResult.size
    };
  }

  getPublicUrl(result: UploadResult): string {
    return result.url;
  }
}
