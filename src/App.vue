<script setup lang="ts">
import { onMounted, computed } from 'vue';
import MainLayout from './components/layout/MainLayout.vue';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import { useThemeManager } from './composables/useTheme';

const { currentTheme, initializeTheme } = useThemeManager();

// 计算根元素的类名
const rootClass = computed(() => {
  return currentTheme.value === 'dark' ? 'dark-theme' : 'light-theme';
});

onMounted(async () => {
  // 初始化主题系统
  await initializeTheme();
  console.log('[App] Theme initialized:', currentTheme.value);
});
</script>

<template>
  <div id="app" :class="rootClass">
    <MainLayout />

    <!-- 全局 Toast 通知 -->
    <Toast position="top-right" />

    <!-- 全局确认对话框 -->
    <ConfirmDialog />
  </div>
</template>

<style>
/* 全局样式 - 不需要 scoped */
#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 确保深色主题类应用到根元素 */
#app.dark-theme {
  color-scheme: dark;
}

#app.light-theme {
  color-scheme: light;
}
</style>
