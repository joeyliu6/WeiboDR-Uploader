<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { ContextMenuItem } from '../types';

const props = defineProps<{
  /** 菜单项 */
  items: ContextMenuItem[];
  /** 是否显示 */
  visible: boolean;
  /** X 坐标 */
  x: number;
  /** Y 坐标 */
  y: number;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
}>();

const menuRef = ref<HTMLElement | null>(null);

// 关闭菜单
const closeMenu = () => {
  emit('update:visible', false);
};

// 处理菜单项点击
const handleItemClick = (item: ContextMenuItem) => {
  if (item.disabled) return;
  item.action();
  closeMenu();
};

// 点击外部关闭
const handleClickOutside = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    closeMenu();
  }
};

// 按 ESC 关闭
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        ref="menuRef"
        class="context-menu"
        :style="{ left: `${x}px`, top: `${y}px` }"
      >
        <template v-for="item in items" :key="item.id">
          <div v-if="item.separator" class="menu-separator"></div>
          <button
            v-else
            class="menu-item"
            :class="{ disabled: item.disabled, danger: item.danger }"
            @click="handleItemClick(item)"
            :disabled="item.disabled"
          >
            <i :class="`pi ${item.icon}`" class="menu-icon"></i>
            <span class="menu-label">{{ item.label }}</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 180px;
  padding: 6px;
  background: rgba(30, 30, 30, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  backdrop-filter: blur(20px);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.12s ease;
  text-align: left;
  border-radius: 8px;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background: none;
}

.menu-item.danger {
  color: var(--error);
}

.menu-item.danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

.menu-icon {
  font-size: 14px;
  width: 16px;
  text-align: center;
  opacity: 0.7;
}

.menu-item:hover .menu-icon {
  opacity: 1;
}

.menu-label {
  flex: 1;
  font-weight: 500;
}

.menu-separator {
  height: 1px;
  margin: 4px 8px;
  background: rgba(255, 255, 255, 0.08);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}
</style>
