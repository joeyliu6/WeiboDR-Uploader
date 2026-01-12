<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { LINK_FORMATS, type LinkFormat, type StorageObject } from '../types';

const props = defineProps<{
  /** 选中的项目 */
  selectedItems: StorageObject[];
  /** 是否显示 */
  visible: boolean;
}>();

const emit = defineEmits<{
  delete: [];
  copyLink: [format: LinkFormat];
  download: [];
  close: [];
}>();

// 复制链接菜单
const copyMenuRef = ref();
const copyMenuItems = LINK_FORMATS.map((format) => ({
  label: format.label,
  icon: `pi ${format.icon}`,
  command: () => emit('copyLink', format.format),
}));

const toggleCopyMenu = (event: Event) => {
  copyMenuRef.value.toggle(event);
};

// 文件数量
const fileCount = () => props.selectedItems.filter((i) => i.type === 'file').length;
</script>

<template>
  <Transition name="slide-up">
    <div v-if="visible && selectedItems.length > 0" class="floating-action-bar">
      <div class="selection-info">
        <span>已选择 {{ selectedItems.length }} 项</span>
        <span v-if="fileCount() !== selectedItems.length" class="file-hint">
          ({{ fileCount() }} 个文件)
        </span>
      </div>

      <div class="action-buttons">
        <!-- 复制链接 -->
        <Button
          v-if="fileCount() > 0"
          label="复制链接"
          icon="pi pi-copy"
          @click="toggleCopyMenu"
          outlined
          size="small"
        />
        <Menu ref="copyMenuRef" :model="copyMenuItems" :popup="true" />

        <!-- 下载 -->
        <Button
          v-if="fileCount() === 1"
          label="下载"
          icon="pi pi-download"
          @click="emit('download')"
          outlined
          size="small"
        />

        <!-- 删除 -->
        <Button
          label="删除"
          icon="pi pi-trash"
          @click="emit('delete')"
          severity="danger"
          outlined
          size="small"
        />

        <!-- 关闭 -->
        <Button
          icon="pi pi-times"
          @click="emit('close')"
          text
          rounded
          size="small"
          v-tooltip.top="'取消选择'"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.floating-action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px 12px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 50px;
  box-shadow: var(--shadow-modal);
  z-index: 100;
  backdrop-filter: blur(12px);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  padding-right: 8px;
  border-right: 1px solid var(--border-subtle);
}

.file-hint {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 400;
}

.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
}

.action-buttons :deep(.p-button) {
  border-radius: 20px;
}

.action-buttons :deep(.p-button-outlined) {
  border-width: 1px;
}

/* 动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(24px);
  opacity: 0;
}
</style>
