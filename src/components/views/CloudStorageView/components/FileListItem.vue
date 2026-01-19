<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import type { StorageObject } from '../types';

const props = defineProps<{
  item: StorageObject;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [item: StorageObject, event: MouseEvent];
  preview: [item: StorageObject];
  copyLink: [item: StorageObject];
  delete: [item: StorageObject];
  open: [item: StorageObject];
  showDetail: [item: StorageObject];
}>();

const isImage = computed(() => {
  if (props.item.type === 'folder') return false;
  const ext = props.item.name.split('.').pop()?.toLowerCase();
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext || '');
});

const thumbnailUrl = computed(() => {
  if (props.item.type === 'folder') return '';
  return props.item.url || '';
});

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
};

const handleClick = (e: MouseEvent) => {
  emit('select', props.item, e);
};

const handleDoubleClick = () => {
  if (props.item.type === 'folder') {
    emit('open', props.item);
  } else if (isImage.value) {
    emit('preview', props.item);
  } else {
    emit('showDetail', props.item);
  }
};
</script>

<template>
  <div
    class="file-list-item"
    :class="{
      'is-selected': selected,
      'is-folder': item.type === 'folder',
    }"
    @click="handleClick"
    @dblclick="handleDoubleClick"
  >
    <!-- 文件图标（替代缩略图） -->
    <div class="item-icon">
      <i v-if="item.type === 'folder'" class="pi pi-folder folder-icon"></i>
      <i v-else-if="isImage" class="pi pi-image file-icon"></i>
      <i v-else class="pi pi-file file-icon"></i>
    </div>

    <!-- 文件信息 -->
    <div class="item-info">
      <span class="item-name" :title="item.name">{{ item.name }}</span>
    </div>

    <!-- 元信息 -->
    <div class="item-meta">
      <span class="item-size">{{ formatSize(item.size) }}</span>
      <span class="item-time">{{ formatTime(item.lastModified) }}</span>
    </div>

    <!-- 操作按钮 -->
    <div class="item-actions">
      <Button
        v-if="item.type === 'file' && isImage"
        icon="pi pi-eye"
        @click.stop="emit('showDetail', item)"
        size="small"
        text
        rounded
        v-tooltip.top="'预览'"
      />
      <Button
        v-if="item.type === 'file'"
        icon="pi pi-copy"
        @click.stop="emit('copyLink', item)"
        size="small"
        text
        rounded
        v-tooltip.top="'复制链接'"
      />
      <Button
        icon="pi pi-trash"
        @click.stop="emit('delete', item)"
        severity="danger"
        size="small"
        text
        rounded
        v-tooltip.top="'删除'"
      />
    </div>
  </div>
</template>

<style scoped>
.file-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.file-list-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-list-item.is-selected {
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.12);
  border-color: rgba(var(--primary-rgb, 59, 130, 246), 0.3);
}

/* 文件图标 */
.item-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-icon .folder-icon {
  font-size: 1.1rem;
  color: #f59e0b;
}

.item-icon .file-icon {
  font-size: 1rem;
  color: var(--text-muted);
}

/* 文件信息 */
.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 元信息 */
.item-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  min-width: 120px;
}

.item-size {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 50px;
  text-align: right;
}

.item-time {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 60px;
  text-align: right;
}

/* 操作按钮 */
.item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.file-list-item:hover .item-actions {
  opacity: 1;
}

.item-actions :deep(.p-button) {
  width: 32px;
  height: 32px;
  color: var(--text-secondary);
}

.item-actions :deep(.p-button:hover) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.item-actions :deep(.p-button-danger:hover) {
  background: rgba(239, 68, 68, 0.15);
  color: var(--error);
}
</style>
