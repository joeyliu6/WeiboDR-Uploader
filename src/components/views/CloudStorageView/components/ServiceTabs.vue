<script setup lang="ts">
import type { ServiceStatus, CloudServiceType, ConnectionStatus } from '../types';
import { getServiceIcon } from '../../../../utils/icons';

const props = defineProps<{
  services: ServiceStatus[];
  activeService: CloudServiceType;
  expanded?: boolean;
}>();

const emit = defineEmits<{
  change: [serviceId: CloudServiceType];
}>();

const getStatusClass = (status: ConnectionStatus): string => {
  switch (status) {
    case 'connected':
      return 'status-connected';
    case 'connecting':
      return 'status-connecting';
    case 'error':
      return 'status-error';
    case 'unconfigured':
      return 'status-unconfigured';
    default:
      return 'status-disconnected';
  }
};

const getServiceSvg = (serviceId: string): string | null => {
  return getServiceIcon(serviceId as CloudServiceType) || null;
};
</script>

<template>
  <nav class="service-nav" :class="{ expanded }">
    <!-- 标题区域 -->
    <div class="nav-header">
      <i class="pi pi-cloud nav-icon"></i>
      <span class="nav-title">云存储</span>
    </div>

    <div class="service-list">
      <button
        v-for="service in services"
        :key="service.serviceId"
        class="service-item"
        :class="{
          active: service.serviceId === activeService,
          [getStatusClass(service.status)]: true,
        }"
        @click="emit('change', service.serviceId)"
        :title="service.serviceName"
      >
        <span class="service-icon-svg" v-html="getServiceSvg(service.serviceId)"></span>
        <span class="service-name">{{ service.serviceName }}</span>
        <span class="status-dot" :class="getStatusClass(service.status)"></span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.service-nav {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px 6px;
}

.service-nav.expanded {
  padding: 12px 8px;
}

/* 标题区域 */
.nav-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.service-nav.expanded .nav-header {
  justify-content: flex-start;
  padding: 8px 12px;
}

.nav-icon {
  font-size: 18px;
  color: var(--primary);
  flex-shrink: 0;
}

.nav-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  opacity: 0;
  width: 0;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}

.service-nav.expanded .nav-title {
  opacity: 1;
  width: auto;
}

.service-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.service-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  position: relative;
}

.service-nav.expanded .service-item {
  justify-content: flex-start;
  padding: 10px 12px;
}

.service-item:hover {
  background: var(--hover-overlay);
  color: var(--text-primary);
}

.service-item.active {
  background: var(--primary);
  color: white;
}

.service-item.active .service-icon-svg {
  color: white;
}

.service-icon-svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: color 0.15s;
}

.service-icon-svg :deep(svg) {
  width: 100%;
  height: 100%;
}

.service-item:hover .service-icon-svg {
  color: var(--text-primary);
}

.service-name {
  flex: 1;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0;
  width: 0;
  transition: opacity 0.2s ease;
}

.service-nav.expanded .service-name {
  opacity: 1;
  width: auto;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.service-nav.expanded .status-dot {
  opacity: 1;
}

.service-item.active .status-dot {
  background: rgba(255, 255, 255, 0.8);
}

.status-dot.status-connected {
  background: var(--success);
}

.status-dot.status-connecting {
  background: var(--warning);
}

.status-dot.status-error {
  background: var(--error);
}

.status-dot.status-unconfigured {
  background: var(--text-muted);
}

.status-dot.status-disconnected {
  background: var(--text-muted);
}

.service-nav::-webkit-scrollbar {
  width: 4px;
}

.service-nav::-webkit-scrollbar-track {
  background: transparent;
}

.service-nav::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 2px;
}

.service-nav::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
