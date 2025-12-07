<script setup lang="ts">
import { ref } from 'vue';
import TitleBar from './TitleBar.vue';
import Sidebar from './Sidebar.vue';
import UploadView from '../views/UploadView.vue';
import HistoryView from '../views/HistoryView.vue';
import R2ManagerView from '../views/R2ManagerView.vue';
import BackupView from '../BackupView.vue';
import LinkCheckerView from '../views/LinkCheckerView.vue';
import SettingsView from '../views/SettingsView.vue';

type ViewType = 'upload' | 'history' | 'r2-manager' | 'backup' | 'link-checker' | 'settings';

const currentView = ref<ViewType>('upload');

const handleNavigate = (view: ViewType) => {
  currentView.value = view;
};
</script>

<template>
  <div class="main-layout">
    <TitleBar />
    <div class="dashboard-container">
      <Sidebar @navigate="handleNavigate" />
      <div class="content-area">
        <UploadView v-if="currentView === 'upload'" />
        <HistoryView v-else-if="currentView === 'history'" />
        <R2ManagerView v-else-if="currentView === 'r2-manager'" />
        <BackupView v-else-if="currentView === 'backup'" />
        <LinkCheckerView v-else-if="currentView === 'link-checker'" />
        <SettingsView v-else-if="currentView === 'settings'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-layout {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-app);
}

.dashboard-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow: hidden;
  background: var(--bg-app);
}
</style>
