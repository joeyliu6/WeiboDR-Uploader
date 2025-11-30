/**
 * 模板上传器
 *
 * 这是一个完整的上传器实现模板
 * 复制这个文件并修改以添加新的图床服务
 *
 * 实现步骤：
 * 1. 复制此文件到新目录（如 src/uploaders/nami/NamiUploader.ts）
 * 2. 修改类名、serviceId、serviceName
 * 3. 实现 validateConfig 方法（验证配置）
 * 4. 实现 upload 方法（调用 Rust 上传）
 * 5. 在 Rust 端实现对应的上传命令
 * 6. 在 src/uploaders/index.ts 中注册
 */

import { BaseUploader } from '../base/BaseUploader';
import { UploadResult, ValidationResult, UploadOptions, ProgressCallback } from '../base/types';

/**
 * 图床特定的配置接口
 * 根据实际需求修改
 */
interface TemplateServiceConfig {
  enabled: boolean;
  cookie?: string;         // 如果需要 Cookie 认证
  apiKey?: string;        // 如果需要 API Key
  // ... 其他配置字段
}

/**
 * Rust 返回的上传结果
 * 根据实际 Rust 命令的返回值修改
 */
interface TemplateRustResult {
  fileId: string;         // 图床返回的文件 ID
  url: string;            // 图床返回的访问 URL
  size: number;           // 文件大小
  // ... 其他字段
}

/**
 * 模板上传器
 * 替换为实际的图床名称（如 NamiUploader, JDUploader）
 */
export class TemplateUploader extends BaseUploader {
  // 修改为实际的服务 ID（小写英文，如 'nami', 'jd'）
  readonly serviceId = 'template';

  // 修改为实际的服务名称（中文，如 '纳米图床', '京东图床'）
  readonly serviceName = '模板图床';

  /**
   * 返回对应的 Rust 命令名
   * 命令格式建议：upload_to_{service_id}
   */
  protected getRustCommand(): string {
    return 'upload_to_template';  // 修改为实际的 Rust 命令名
  }

  /**
   * 验证配置
   * 检查所有必填字段是否已填写
   */
  async validateConfig(config: any): Promise<ValidationResult> {
    const serviceConfig = config as TemplateServiceConfig;
    const missingFields: string[] = [];
    const errors: string[] = [];

    // 示例：检查 Cookie
    if (this.isEmpty(serviceConfig.cookie)) {
      missingFields.push('Cookie');
      errors.push('请先在设置中配置图床 Cookie');
    }

    // 示例：检查 API Key
    if (this.isEmpty(serviceConfig.apiKey)) {
      missingFields.push('API Key');
      errors.push('请先在设置中配置 API Key');
    }

    // 如果有缺失字段，返回验证失败
    if (missingFields.length > 0) {
      return {
        valid: false,
        missingFields,
        errors
      };
    }

    // 验证通过
    return { valid: true };
  }

  /**
   * 上传文件
   * 调用 Rust 后端执行上传，然后转换结果
   */
  async upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    const config = options.config as TemplateServiceConfig;

    this.log('info', '开始上传', { filePath });

    try {
      // 调用基类的 Rust 上传方法
      // 传递的参数需要与 Rust 命令的参数匹配
      const rustResult = await this.uploadViaRust(
        filePath,
        {
          // 传递给 Rust 的参数
          // 根据实际 Rust 命令修改
          cookie: config.cookie,
          apiKey: config.apiKey,
          // ... 其他参数
        },
        onProgress
      ) as TemplateRustResult;

      this.log('info', '上传成功', rustResult);

      // 转换 Rust 结果为标准 UploadResult
      return {
        serviceId: this.serviceId,
        fileKey: rustResult.fileId,
        url: rustResult.url,
        size: rustResult.size,
        metadata: {
          // 可选：存储图床特定的元数据
          // fileId: rustResult.fileId,
        }
      };
    } catch (error) {
      this.log('error', '上传失败', error);

      // 可选：转换错误为更友好的提示
      throw this.convertError(error);
    }
  }

  /**
   * 生成公开访问 URL
   * 如果 Rust 已经返回完整 URL，直接返回即可
   * 如果需要拼接 URL，在这里实现
   */
  getPublicUrl(result: UploadResult): string {
    return result.url;

    // 示例：如果需要拼接 URL
    // const domain = 'https://example.com';
    // return `${domain}/${result.fileKey}`;
  }

  /**
   * 转换错误（可选）
   * 将通用错误转换为更友好的提示
   */
  private convertError(error: any): Error {
    const msg = error?.message || String(error);

    // 根据错误信息返回友好提示
    if (msg.includes('cookie') || msg.includes('Cookie')) {
      return new Error(`${this.serviceName} Cookie 已过期，请重新登录`);
    }

    if (msg.includes('network') || msg.includes('timeout')) {
      return new Error(`${this.serviceName}网络错误，请稍后重试`);
    }

    // 默认错误
    return new Error(`${this.serviceName}上传失败: ${msg}`);
  }
}

/**
 * 使用示例：
 *
 * 1. 在 src/uploaders/index.ts 中注册：
 *    UploaderFactory.register('template', () => new TemplateUploader());
 *
 * 2. 在 Rust 端实现命令（src-tauri/src/commands/template.rs）：
 *    #[tauri::command]
 *    pub async fn upload_to_template(
 *        window: Window,
 *        id: String,
 *        file_path: String,
 *        cookie: String,
 *        api_key: String,
 *    ) -> Result<TemplateRustResult, String> {
 *        // 实现上传逻辑
 *    }
 *
 * 3. 在 src-tauri/src/main.rs 中注册命令：
 *    commands::template::upload_to_template,
 *
 * 4. 添加到 UserConfig 的 services 中（src/config/types.ts）：
 *    template?: TemplateServiceConfig;
 *
 * 5. 在设置页面添加配置界面
 */
