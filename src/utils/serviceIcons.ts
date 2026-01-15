import type { ServiceType } from '../config/types';

/**
 * 使用 Vite 的 import.meta.glob 导入所有服务图标 SVG
 * eager: true 表示同步加载，raw: true 表示获取原始字符串内容
 */
const iconModules = import.meta.glob<string>(
  '../assets/icons/services/*.svg',
  { eager: true, query: '?raw', import: 'default' }
);

/**
 * 服务图标映射表
 * 将 ServiceType 映射到对应的 SVG 内容
 */
const serviceIconMap: Partial<Record<ServiceType, string>> = {};

// 解析导入的模块，构建映射表
for (const [path, content] of Object.entries(iconModules)) {
  // 从路径中提取文件名（不含扩展名）
  const match = path.match(/\/([^/]+)\.svg$/);
  if (match) {
    const name = match[1] as ServiceType;
    serviceIconMap[name] = content;
  }
}

/**
 * 获取服务图标 SVG 内容
 * @param service 服务类型
 * @returns SVG 字符串，如果不存在则返回 undefined
 */
export function getServiceIcon(service: ServiceType): string | undefined {
  return serviceIconMap[service];
}

/**
 * 获取所有已加载的服务图标
 */
export function getAllServiceIcons(): Partial<Record<ServiceType, string>> {
  return serviceIconMap;
}

/**
 * 检查服务是否有对应的图标
 */
export function hasServiceIcon(service: ServiceType): boolean {
  return service in serviceIconMap;
}
