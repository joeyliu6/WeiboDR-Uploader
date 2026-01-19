<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Menu from 'primevue/menu';
import Breadcrumb from './Breadcrumb.vue';
import type { StorageStats } from '../types';

const props = defineProps<{
  currentPath: string;
  bucketName?: string;
  stats: StorageStats | null;
  loading: boolean;
  searchQuery: string;
}>();

const emit = defineEmits<{
  navigate: [path: string];
  refresh: [];
  upload: [];
  search: [query: string];
}>();

const localSearchQuery = ref(props.searchQuery);
const searchFocused = ref(false);
const menuRef = ref();

watch(
  () => props.searchQuery,
  (newVal) => {
    localSearchQuery.value = newVal;
  }
);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const handleSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    emit('search', localSearchQuery.value);
  }, 300);
};

const menuItems = ref([
  {
    label: '刷新',
    icon: 'pi pi-refresh',
    command: () => emit('refresh'),
  },
  {
    separator: true,
  },
  {
    label: '上传文件',
    icon: 'pi pi-upload',
    command: () => emit('upload'),
  },
]);

const toggleMenu = (event: Event) => {
  menuRef.value.toggle(event);
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
      <div class="search-wrapper" :class="{ focused: searchFocused }">
        <i class="pi pi-search search-icon"></i>
        <InputText
          v-model="localSearchQuery"
          placeholder="搜索..."
          @input="handleSearchInput"
          @focus="searchFocused = true"
          @blur="searchFocused = false"
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

      <!-- 上传按钮 -->
      <Button
        icon="pi pi-upload"
        @click="emit('upload')"
        size="small"
        class="upload-btn"
        v-tooltip.bottom="'上传文件'"
      />

      <!-- 更多菜单 -->
      <Button
        icon="pi pi-ellipsis-v"
        @click="toggleMenu"
        text
        rounded
        size="small"
        class="more-btn"
        :loading="loading"
        v-tooltip.bottom="'更多操作'"
      />
      <Menu ref="menuRef" :model="menuItems" :popup="true" class="toolbar-menu" />
    </div>
  </div>
</template>

<style scoped>
.storage-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  min-height: 52px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 搜索框 */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  font-size: 13px;
  pointer-events: none;
  transition: color 0.2s;
}

.search-wrapper.focused .search-icon {
  color: var(--primary);
}

.search-input {
  padding-left: 32px;
  padding-right: 28px;
  width: 140px;
  height: 34px;
  font-size: 13px;
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
}

.search-input:focus {
  width: 200px;
  background: var(--bg-card);
  border-color: var(--primary);
  box-shadow: var(--focus-ring-shadow);
}

.search-clear {
  position: absolute;
  right: 2px;
  width: 24px;
  height: 24px;
}

.search-clear :deep(.p-button-icon) {
  font-size: 12px;
}

/* 上传按钮 */
.upload-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
}

/* 更多按钮 */
.more-btn {
  width: 34px;
  height: 34px;
  color: var(--text-secondary);
}

.more-btn:hover {
  color: var(--text-primary);
  background: var(--hover-overlay);
}
</style>

<style>
/* 菜单样式（非 scoped） */
.toolbar-menu.p-menu {
  background: var(--bg-card);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  box-shadow: var(--shadow-float);
  min-width: 160px;
}

.toolbar-menu .p-menuitem-link {
  padding: 10px 14px;
  border-radius: 6px;
  margin: 2px 4px;
  transition: background 0.15s;
}

.toolbar-menu .p-menuitem-link:hover {
  background: var(--hover-overlay);
}

.toolbar-menu .p-menuitem-icon {
  color: var(--text-muted);
  margin-right: 10px;
}

.toolbar-menu .p-menuitem-text {
  color: var(--text-primary);
  font-size: 13px;
}

.toolbar-menu .p-menu-separator {
  border-color: var(--border-subtle);
  margin: 4px 8px;
}
</style>
