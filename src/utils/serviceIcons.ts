import type { ServiceType } from '../config/types';

const iconModules = import.meta.glob<string>(
  '../assets/icons/services/*.svg',
  { eager: true, query: '?raw', import: 'default' }
);

function extractFileName(path: string): string | null {
  const match = path.match(/\/([^/]+)\.svg$/);
  return match ? match[1] : null;
}

const serviceIconMap: Partial<Record<ServiceType, string>> = Object.fromEntries(
  Object.entries(iconModules)
    .map(([path, content]) => {
      const name = extractFileName(path);
      return name ? [name as ServiceType, content] : null;
    })
    .filter((entry): entry is [ServiceType, string] => entry !== null)
);

export function getServiceIcon(service: ServiceType): string | undefined {
  return serviceIconMap[service];
}

export function getAllServiceIcons(): Partial<Record<ServiceType, string>> {
  return serviceIconMap;
}

export function hasServiceIcon(service: ServiceType): boolean {
  return service in serviceIconMap;
}
