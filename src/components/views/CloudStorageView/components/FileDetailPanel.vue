<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import CopyableUrl from './CopyableUrl.vue';
import type { StorageObject, LinkFormat } from '../types';

const props = defineProps<{
  file: StorageObject | null;
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
  download: [file: StorageObject];
  delete: [file: StorageObject];
  copyLink: [file: StorageObject, format: LinkFormat];
}>();

const isImage = computed(() => {
  if (!props.file || props.file.type === 'folder') return false;
  const ext = props.file.name.split('.').pop()?.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext || '');
});

const mimeType = computed(() => {
  if (!props.file) return '';
  if (props.file.type === 'folder') return 'folder';
  const ext = props.file.name.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
});

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
};

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const handleOverlayClick = (e: MouseEvent) => {
  if ((e.target as HTMLElement).classList.contains('drawer-overlay')) {
    emit('close');
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="visible && file"
        class="drawer-overlay"
        @click="handleOverlayClick"
      >
        <div class="drawer-panel" @click.stop>
          <div class="drawer-header">
            <Button
              icon="pi pi-times"
              text
              rounded
              size="small"
              @click="emit('close')"
              class="close-btn"
            />
            <div class="header-actions">
              <Button
                icon="pi pi-download"
                label="下载"
                outlined
                size="small"
                @click="emit('download', file)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                outlined
                size="small"
                @click="emit('delete', file)"
                v-tooltip.bottom="'删除'"
              />
            </div>
          </div>

          <div class="drawer-path">
            <span class="path-text">{{ file.key }}</span>
          </div>

          <div class="drawer-content">
            <div v-if="isImage && file.url" class="preview-section">
              <img :src="file.url" :alt="file.name" class="preview-image" />
            </div>

            <div class="info-section">
              <div class="section-title">文件详情</div>
              <div class="info-grid">
                <div class="info-row">
                  <span class="info-label">文件名</span>
                  <span class="info-value">{{ file.name }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">大小</span>
                  <span class="info-value">{{ formatSize(file.size) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">类型</span>
                  <span class="info-value">{{ mimeType }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">修改时间</span>
                  <span class="info-value">{{ formatDate(file.lastModified) }}</span>
                </div>
              </div>
            </div>

            <div v-if="file.url" class="info-section">
              <div class="section-title">访问链接</div>
              <CopyableUrl :url="file.url" @copy="emit('copyLink', file, 'url')" />
              <div class="url-actions">
                <Button
                  icon="pi pi-link"
                  label="复制 URL"
                  text
                  size="small"
                  @click="emit('copyLink', file, 'url')"
                />
                <Button
                  icon="pi pi-code"
                  label="复制 Markdown"
                  text
                  size="small"
                  @click="emit('copyLink', file, 'markdown')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 400px;
  max-width: 90vw;
  height: 100%;
  background: rgba(25, 25, 25, 0.95);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.close-btn {
  color: var(--text-secondary);
}

.close-btn:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.1);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.drawer-path {
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.path-text {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
  line-height: 1.5;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.preview-section {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  max-height: 280px;
  overflow: hidden;
}

.preview-image {
  max-width: 100%;
  max-height: 240px;
  object-fit: contain;
  border-radius: 8px;
}

.info-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.info-grid {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  overflow: hidden;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: var(--text-muted);
}

.info-value {
  font-size: 13px;
  color: var(--text-primary);
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.url-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.drawer-content::-webkit-scrollbar {
  width: 6px;
}

.drawer-content::-webkit-scrollbar-track {
  background: transparent;
}

.drawer-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.drawer-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

@media (max-width: 480px) {
  .drawer-panel {
    width: 100%;
  }
}
</style>
