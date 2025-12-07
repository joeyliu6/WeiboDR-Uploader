// src/main-new.ts
// 新架构的主入口文件 - 使用 Vue 3 + PrimeVue 单应用模式

import { createApp } from 'vue';
import App from './App.vue';

// PrimeVue 相关导入
import PrimeVue from 'primevue/config';
import { WeiboDRPreset } from './theme';
import ToastService from 'primevue/toastservice';
import ConfirmationService from 'primevue/confirmationservice';
import Tooltip from 'primevue/tooltip';

// PrimeVue 样式
import 'primeicons/primeicons.css';
import './theme/transitions.css';
import './theme/light-theme.css';

// 创建 Vue 应用实例
const app = createApp(App);

// 配置 PrimeVue
app.use(PrimeVue, {
  theme: {
    preset: WeiboDRPreset,
    options: {
      darkModeSelector: '.dark-theme',
      cssLayer: { name: 'primevue', order: 'reset, primevue, app' }
    }
  },
  ripple: true
});

// 配置 PrimeVue 服务
app.use(ToastService);
app.use(ConfirmationService);
app.directive('tooltip', Tooltip);

// 挂载应用
app.mount('#app');

console.log('[App] WeiboDR-Uploader 已启动 (新架构 - PrimeVue)');
