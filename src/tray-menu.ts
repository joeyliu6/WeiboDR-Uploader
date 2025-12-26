// src/tray-menu.ts
// 托盘菜单 Vue 应用入口
import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import { PicNexusPreset } from './theme';
import TrayMenu from './components/tray/TrayMenu.vue';

// 引入样式
import 'primeicons/primeicons.css';
import './theme/dark-theme.css';
import './theme/light-theme.css';

// 同步主题（从 localStorage 读取，与主窗口保持一致）
const savedTheme = localStorage.getItem('picnexus-theme') || 'dark-theme';
document.documentElement.classList.add(savedTheme);

// 创建 Vue 应用
const app = createApp(TrayMenu);

// 配置 PrimeVue
app.use(PrimeVue, {
  theme: {
    preset: PicNexusPreset,
    options: {
      darkModeSelector: '.dark-theme',
    }
  }
});

// 挂载应用
app.mount('#app');

console.log('[TrayMenu] Vue app mounted');
