// src/core/LinkGenerator.ts
// 链接生成逻辑

import { UploadResult } from '../uploaders/base/types';
import { UserConfig } from '../config/types';

/**
 * 链接生成器
 * 负责根据配置生成最终的图片链接
 */
export class LinkGenerator {
  /**
   * 生成最终链接
   * 处理百度前缀等特殊逻辑
   *
   * @param result 上传结果
   * @param config 用户配置
   * @returns 最终生成的链接
   */
  static generate(result: UploadResult, config: UserConfig): string {
    // 只有微博 + baidu-proxy 模式才加百度前缀
    if (
      result.serviceId === 'weibo' &&
      config.outputFormat === 'baidu-proxy' &&
      config.baiduPrefix
    ) {
      const baiduLink = `${config.baiduPrefix}${result.url}`;
      console.log('[LinkGenerator] 生成百度代理链接:', baiduLink);
      return baiduLink;
    }

    // 其他情况直接返回原始 URL
    console.log('[LinkGenerator] 使用直接链接:', result.url);
    return result.url;
  }

  /**
   * 验证链接格式
   *
   * @param link 链接
   * @returns 是否为有效链接
   */
  static isValidLink(link: string): boolean {
    try {
      const url = new URL(link);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 获取原始链接（去除百度前缀）
   *
   * @param generatedLink 生成的链接
   * @param baiduPrefix 百度前缀
   * @returns 原始链接
   */
  static getOriginalLink(generatedLink: string, baiduPrefix?: string): string {
    if (baiduPrefix && generatedLink.startsWith(baiduPrefix)) {
      return generatedLink.substring(baiduPrefix.length);
    }
    return generatedLink;
  }
}
