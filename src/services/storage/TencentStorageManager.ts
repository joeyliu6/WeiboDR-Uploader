import { BaseS3StorageManager } from './S3StorageManager';

export class TencentStorageManager extends BaseS3StorageManager {
  readonly serviceId = 'tencent';
  readonly serviceName = '腾讯云';

  protected getEndpoint(): string {
    return `https://cos.${this.config.region}.myqcloud.com`;
  }

  protected getAccessKey(): string {
    return this.config.secretId;
  }

  protected getSecretKey(): string {
    return this.config.secretKey;
  }

  protected getRegion(): string {
    return this.config.region;
  }

  protected getBucket(): string {
    return this.config.bucket;
  }

  protected getPublicDomain(): string {
    return this.config.publicDomain;
  }
}
