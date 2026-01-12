<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import Breadcrumb from './Breadcrumb.vue';
import type { StorageStats } from '../types';

const props = defineProps<{
  /** 当前路径 */
  currentPath: string;
  /** 存储桶名称 */
  bucketName?: string;
  /** 统计信息 */
  stats: StorageStats | null;
  /** 是否加载中 */
  loading: boolean;
  /** 是否全选 */
  isAllSelected: boolean;
  /** 是否部分选中 */
  isIndeterminate: boolean;
  /** 选中数量 */
  selectedCount: number;
  /** 搜索关键词 */
  searchQuery: string;
}>();

const emit = defineEmits<{
  navigate: [path: string];
  refresh: [];
  upload: [];
  search: [query: string];
  toggleSelectAll: [];
}>();

// 本地搜索值
const localSearchQuery = ref(props.searchQuery);

// 同步外部搜索值
watch(
  () => props.searchQuery,
  (newVal) => {
    localSearchQuery.value = newVal;
  }
);

// 搜索防抖
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const handleSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    emit('search', localSearchQuery.value);
  }, 300);
};

// 格式化大小
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
};
</script>

<template>
  <div class="storage-toolbar">
    <!-- 左侧：面包屑导航 -->
    <div class="toolbar-left">
      <Breadcrumb
        :path="currentPath"
        :bucket-name="bucketName"
        @navigate="(path) => emit('navigate', path)"
      />
    </div>

    <!-- 右侧：操作区 -->
    <div class="toolbar-right">
      <!-- 搜索框 -->
      <div class="search-wrapper">
        <i class="pi pi-search search-icon"></i>
        <InputText
          v-model="localSearchQuery"
          placeholder="搜索文件..."
          @input="handleSearchInput"
          class="search-input"
        />
        <Button
          v-if="localSearchQuery"
          icon="pi pi-times"
          text
          rounded
          size="small"
          class="search-clear"
          @click="localSearchQuery = ''; emit('search', '')"
        />
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 全选 -->
      <div class="select-all">
        <Checkbox
          :modelValue="isAllSelected"
          :indeterminate="isIndeterminate"
          :binary="true"
          @change="emit('toggleSelectAll')"
          inputId="select-all"
        />
        <label for="select-all">全选</label>
      </div>

      <!-- 统计信息 -->
      <div v-if="stats" class="stats-info">
        <span class="stats-count">{{ stats.objectCount }} 个文件</span>
        <span class="stats-separator"></span>
        <span class="stats-size">{{ formatSize(stats.totalSize) }}</span>
      </div>

      <!-- 分隔线 -->
      <div class="toolbar-divider"></div>

      <!-- 操作按钮组 -->
      <div class="action-buttons">
        <Button
          label="上传"
          icon="pi pi-upload"
          @click="emit('upload')"
          size="small"
          class="upload-btn"
        />

        <Button
          icon="pi pi-refresh"
          @click="emit('refresh')"
          :loading="loading"
          text
          rounded
          size="small"
          v-tooltip.top="'刷新'"
          class="refresh-btn"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  min-height: 60px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 200px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

/* 分隔线 */
.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-subtle);
}

/* 搜索框 */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  font-size: 14px;
  pointer-events: none;
}

.search-input {
  padding-left: 36px;
  padding-right: 32px;
  width: 220px;
  border-radius: 8px;
  background: var(--bg-app);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
}

.search-input:focus {
  background: var(--bg-card);
  border-color: var(--primary);
  box-shadow: var(--focus-ring-shadow);
}

.search-clear {
  position: absolute;
  right: 4px;
}

/* 全选 */
.select-all {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-all label {
  cursor: pointer;
  user-select: none;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

/* 统计信息 */
.stats-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 6px 12px;
  background: var(--bg-app);
  border-radius: 6px;
}

.stats-count {
  font-weight: 500;
}

.stats-separator {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-muted);
}

.stats-size {
  color: var(--text-muted);
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-btn {
  font-weight: 500;
}

.refresh-btn {
  color: var(--text-secondary);
}

.refresh-btn:hover {
  color: var(--primary);
  background: var(--hover-overlay);
}
</style>
