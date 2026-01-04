import { BaseS3Uploader } from '../s3/BaseS3Uploader';

export class CosUploader extends BaseS3Uploader {
  readonly serviceId = 'cos';
  readonly serviceName = '腾讯云 COS';

  protected getEndpoint(config: any): string {
    const region = config.region;
    return `https://cos.${region}.myqcloud.com`;
  }

  protected getAccessKey(config: any): string {
    return config.secretId;
  }

  protected getSecretKey(config: any): string {
    return config.secretKey;
  }

  protected getRegion(config: any): string {
    return config.region;
  }

  protected getBucket(config: any): string {
    return config.bucket;
  }

  protected getPath(config: any): string {
    const path = config.path || 'images/';
    return path.endsWith('/') ? path : path + '/';
  }

  protected getPublicDomain(config: any): string {
    return config.publicDomain || '';
  }
}
