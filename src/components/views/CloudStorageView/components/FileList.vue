<script setup lang="ts">
import { ref, computed } from 'vue';
import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import FileListItem from './FileListItem.vue';
import EmptyState from './EmptyState.vue';
import type { StorageObject } from '../types';

const props = defineProps<{
  items: StorageObject[];
  selectedKeys: Set<string>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isDragging?: boolean;
}>();

const emit = defineEmits<{
  select: [item: StorageObject, event: MouseEvent];
  preview: [item: StorageObject];
  copyLink: [item: StorageObject];
  delete: [item: StorageObject];
  open: [item: StorageObject];
  loadMore: [];
  upload: [];
  showDetail: [item: StorageObject];
}>();

const listContainerRef = ref<HTMLElement | null>(null);

const isSelected = (item: StorageObject) => props.selectedKeys.has(item.key);

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const threshold = 100;
  const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;

  if (isNearBottom && props.hasMore && !props.loading) {
    emit('loadMore');
  }
};
</script>

<template>
  <div class="file-list-wrapper" :class="{ dragging: isDragging }">
    <!-- 拖拽上传遮罩 -->
    <Transition name="fade">
      <div v-if="isDragging" class="drag-overlay">
        <div class="drag-content">
          <div class="drag-icon-wrapper">
            <i class="pi pi-cloud-upload drag-icon"></i>
          </div>
          <p class="drag-title">释放以上传文件</p>
          <p class="drag-hint">支持批量上传图片</p>
        </div>
      </div>
    </Transition>

    <!-- 骨架屏加载状态 -->
    <div v-if="loading && items.length === 0" class="skeleton-list">
      <div v-for="i in 6" :key="i" class="skeleton-item">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-info">
          <div class="skeleton-name"></div>
          <div class="skeleton-meta"></div>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <Message v-else-if="error && items.length === 0" severity="error" :closable="false">
      {{ error }}
    </Message>

    <!-- 空状态 -->
    <EmptyState
      v-else-if="items.length === 0"
      icon="pi-cloud-upload"
      title="暂无文件"
      description="拖拽文件到此处上传，或点击下方按钮选择文件"
      actionLabel="上传文件"
      actionIcon="pi-upload"
      @action="emit('upload')"
    />

    <!-- 文件列表 -->
    <div
      v-else
      ref="listContainerRef"
      class="list-container"
      @scroll="handleScroll"
    >
      <!-- 列表表头 -->
      <div class="list-header">
        <div class="header-icon"></div>
        <div class="header-name">文件名</div>
        <div class="header-meta">
          <span class="header-size">大小</span>
          <span class="header-time">修改时间</span>
        </div>
        <div class="header-actions">操作</div>
      </div>

      <div class="list-content">
        <FileListItem
          v-for="item in items"
          :key="item.key"
          :item="item"
          :selected="isSelected(item)"
          @select="(i, e) => emit('select', i, e)"
          @preview="(i) => emit('preview', i)"
          @copy-link="(i) => emit('copyLink', i)"
          @delete="(i) => emit('delete', i)"
          @open="(i) => emit('open', i)"
          @show-detail="(i) => emit('showDetail', i)"
        />
      </div>

      <!-- 加载更多指示器 -->
      <div v-if="loading && items.length > 0" class="loading-more">
        <ProgressSpinner style="width: 20px; height: 20px" />
        <span>加载更多...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-list-wrapper {
  position: relative;
  height: 100%;
  background: var(--bg-card);
  border-radius: 12px;
  overflow: hidden;
}

.file-list-wrapper.dragging {
  border: 2px dashed var(--primary);
}

/* 拖拽遮罩 */
.drag-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.drag-content {
  text-align: center;
}

.drag-icon-wrapper {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

.drag-icon {
  font-size: 3rem;
  color: var(--primary);
}

.drag-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary);
  margin: 0 0 8px;
}

.drag-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* 骨架屏 */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.skeleton-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
}

.skeleton-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--bg-app) 25%, var(--bg-secondary) 50%, var(--bg-app) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-info {
  flex: 1;
}

.skeleton-name {
  height: 14px;
  width: 60%;
  background: var(--bg-app);
  border-radius: 4px;
  margin-bottom: 8px;
  animation: shimmer 1.5s infinite;
}

.skeleton-meta {
  height: 10px;
  width: 30%;
  background: var(--bg-app);
  border-radius: 4px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* 列表容器 */
.list-container {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
}

/* 列表表头 */
.list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(8px);
  border-radius: 8px 8px 0 0;
  margin-bottom: 6px;
}

.header-icon {
  width: 24px;
  flex-shrink: 0;
}

.header-name {
  flex: 1;
  min-width: 0;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
}

.header-size {
  min-width: 50px;
  text-align: right;
}

.header-time {
  min-width: 60px;
  text-align: right;
}

.header-actions {
  min-width: 100px;
  text-align: center;
}

.list-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 加载更多 */
.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  color: var(--text-secondary);
  font-size: 13px;
}

/* 滚动条 */
.list-container::-webkit-scrollbar {
  width: 6px;
}

.list-container::-webkit-scrollbar-track {
  background: transparent;
}

.list-container::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.list-container::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
