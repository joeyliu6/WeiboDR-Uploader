/**
 * GitHub CDN 加速链接转换工具
 * 将 GitHub raw URL 转换为各种 CDN 加速 URL
 */

import type { GithubCdnConfig } from '../config/types';

interface GithubUrlParts {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

/**
 * 解析 GitHub raw URL
 * @example
 * 输入: https://raw.githubusercontent.com/user/repo/main/images/test.png
 * 输出: { owner: 'user', repo: 'repo', branch: 'main', path: 'images/test.png' }
 */
export function parseGithubRawUrl(url: string): GithubUrlParts | null {
  const match = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], branch: match[3], path: match[4] };
}

/**
 * 根据模板生成 CDN URL
 */
export function buildCdnUrl(parts: GithubUrlParts, template: string): string {
  return template
    .replace('{owner}', parts.owner)
    .replace('{repo}', parts.repo)
    .replace('{branch}', parts.branch)
    .replace('{path}', parts.path);
}

/**
 * 获取有效的 CDN 索引
 */
function getValidCdnIndex(cdnConfig: GithubCdnConfig): number {
  const { cdnList, selectedIndex } = cdnConfig;
  if (!cdnList?.length) return 0;
  return (selectedIndex >= 0 && selectedIndex < cdnList.length) ? selectedIndex : 0;
}

/**
 * 转换 GitHub 原始 URL 为 CDN 加速 URL
 */
export function transformGithubUrl(rawUrl: string, cdnConfig?: GithubCdnConfig): string {
  if (!cdnConfig?.enabled || !cdnConfig.cdnList?.length) return rawUrl;

  const parts = parseGithubRawUrl(rawUrl);
  if (!parts) return rawUrl;

  const index = getValidCdnIndex(cdnConfig);
  return buildCdnUrl(parts, cdnConfig.cdnList[index].urlTemplate);
}

/**
 * 验证 CDN URL 模板是否有效（必须包含所有占位符）
 */
export function validateCdnTemplate(template: string): boolean {
  return ['{owner}', '{repo}', '{branch}', '{path}'].every(p => template.includes(p));
}

/**
 * 生成预览 URL（用于 UI 展示）
 */
export function generatePreviewUrl(template: string): string {
  return buildCdnUrl(
    { owner: 'user', repo: 'repo', branch: 'main', path: 'images/example.png' },
    template
  );
}
