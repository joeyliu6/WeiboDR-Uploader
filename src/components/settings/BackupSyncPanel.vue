<script setup lang="ts">
// 备份与同步设置面板 - 列表工具型布局

import { computed, onMounted } from 'vue';
import Divider from 'primevue/divider';
import { useBackupSync } from '../../composables/useBackupSync';
import type { WebDAVConfig, AutoSyncConfig } from '../../config/types';

import SyncItemRow from './backup/SyncItemRow.vue';
import AutoSyncRow from './backup/AutoSyncRow.vue';
import WebDAVConfigCollapsible from './backup/WebDAVConfigCollapsible.vue';

// ==================== Props ====================

interface Props {
  /** WebDAV 配置 */
  webdavConfig: WebDAVConfig;

  /** 自动同步配置 */
  autoSyncConfig: AutoSyncConfig;

  /** WebDAV 测试中状态（由父组件管理） */
  webdavTesting?: boolean;
}

const props = defineProps<Props>();

// ==================== Emits ====================

const emit = defineEmits<{
  /** WebDAV 配置变更 */
  'update:webdavConfig': [config: WebDAVConfig];

  /** 自动同步配置变更 */
  'update:autoSyncConfig': [config: AutoSyncConfig];

  /** 保存设置 */
  'save': [];

  /** 测试 WebDAV 连接 */
  'testWebDAV': [];
}>();

// ==================== Composables ====================

const {
  syncStatus,
  exportSettingsLoading,
  importSettingsLoading,
  uploadSettingsLoading,
  downloadSettingsLoading,
  exportHistoryLoading,
  importHistoryLoading,
  uploadHistoryLoading,
  downloadHistoryLoading,
  loadSyncStatus,
  exportSettingsLocal,
  importSettingsLocal,
  exportHistoryLocal,
  importHistoryLocal,
  uploadSettingsCloud,
  downloadSettingsOverwrite,
  downloadSettingsMerge,
  uploadHistoryForce,
  uploadHistoryMerge,
  uploadHistoryIncremental,
  downloadHistoryOverwrite,
  downloadHistoryMerge
} = useBackupSync();

const activeWebDAVProfile = computed(() => {
  return props.webdavConfig.profiles.find(p => p.id === props.webdavConfig.activeId) || null;
});

const isWebDAVConnected = computed(() => {
  const profile = activeWebDAVProfile.value;
  return !!(profile && profile.url && profile.username);
});

const localWebDAVConfig = computed({
  get: () => props.webdavConfig,
  set: (val) => emit('update:webdavConfig', val)
});

const localAutoSyncConfig = computed({
  get: () => props.autoSyncConfig,
  set: (val) => emit('update:autoSyncConfig', val)
});

const configSyncStatus = computed(() => ({
  lastSync: syncStatus.value.configLastSync,
  result: syncStatus.value.configSyncResult,
  error: syncStatus.value.configSyncError
}));

const historySyncStatus = computed(() => ({
  lastSync: syncStatus.value.historyLastSync,
  result: syncStatus.value.historySyncResult,
  error: syncStatus.value.historySyncError
}));

// 间隔选项（不含自定义，简化版）
const intervalOptions = [
  { label: '30 分钟', value: 0.5 },
  { label: '1 小时', value: 1 },
  { label: '3 小时', value: 3 },
  { label: '6 小时', value: 6 },
  { label: '12 小时', value: 12 },
  { label: '24 小时', value: 24 },
  { label: '2 天', value: 48 },
  { label: '5 天', value: 120 }
];

function handleAutoSyncEnabledChange(val: boolean) {
  localAutoSyncConfig.value = { ...localAutoSyncConfig.value, enabled: val };
  handleSave();
}

function handleAutoSyncIntervalChange(val: number) {
  localAutoSyncConfig.value = { ...localAutoSyncConfig.value, intervalHours: val };
  handleSave();
}

onMounted(async () => {
  await loadSyncStatus();
});

function handleSave() {
  emit('save');
}

function handleTestWebDAV() {
  emit('testWebDAV');
}

function handleConfigCloudAction(action: string) {
  if (!activeWebDAVProfile.value) return;

  switch (action) {
    case 'download-merge':
      downloadSettingsMerge(activeWebDAVProfile.value);
      break;
    case 'download-overwrite':
      downloadSettingsOverwrite(activeWebDAVProfile.value);
      break;
  }
}

function handleConfigSyncToCloud() {
  if (activeWebDAVProfile.value) {
    uploadSettingsCloud(activeWebDAVProfile.value);
  }
}

function handleHistoryCloudAction(action: string) {
  if (!activeWebDAVProfile.value) return;

  switch (action) {
    case 'upload-merge':
      uploadHistoryMerge(activeWebDAVProfile.value);
      break;
    case 'upload-incremental':
      uploadHistoryIncremental(activeWebDAVProfile.value);
      break;
    case 'upload-force':
      uploadHistoryForce(activeWebDAVProfile.value);
      break;
    case 'download-merge':
      downloadHistoryMerge(activeWebDAVProfile.value);
      break;
    case 'download-overwrite':
      downloadHistoryOverwrite(activeWebDAVProfile.value);
      break;
  }
}
</script>

<template>
  <div class="backup-sync-panel">
    <!-- 标题区 -->
    <div class="section-header-row">
      <div class="header-left">
        <h2>备份与同步</h2>
        <p class="section-desc">基于 WebDAV 的配置管理与数据流转服务</p>
      </div>
    </div>

    <!-- 分组标题：同步项目 -->
    <div class="group-title">同步项目</div>

    <!-- 配置文件同步行 -->
    <SyncItemRow
      type="config"
      :sync-status="configSyncStatus"
      :is-cloud-enabled="isWebDAVConnected"
      :provider-name="activeWebDAVProfile?.name"
      :loading="{
        upload: uploadSettingsLoading,
        download: downloadSettingsLoading,
        exportLocal: exportSettingsLoading,
        importLocal: importSettingsLoading
      }"
      @sync-to-cloud="handleConfigSyncToCloud"
      @cloud-action="handleConfigCloudAction"
      @export-local="exportSettingsLocal"
      @import-local="importSettingsLocal"
    />

    <Divider />

    <!-- 上传记录同步行 -->
    <SyncItemRow
      type="history"
      :sync-status="historySyncStatus"
      :is-cloud-enabled="isWebDAVConnected"
      :provider-name="activeWebDAVProfile?.name"
      :loading="{
        upload: uploadHistoryLoading,
        download: downloadHistoryLoading,
        exportLocal: exportHistoryLoading,
        importLocal: importHistoryLoading
      }"
      @cloud-action="handleHistoryCloudAction"
      @export-local="exportHistoryLocal"
      @import-local="importHistoryLocal"
    />

    <Divider />

    <!-- 自动同步行（作为同步项目第三行） -->
    <AutoSyncRow
      :config="localAutoSyncConfig"
      :is-cloud-enabled="isWebDAVConnected"
      :interval-options="intervalOptions"
      @update:enabled="handleAutoSyncEnabledChange"
      @update:interval="handleAutoSyncIntervalChange"
    />

    <Divider />

    <!-- WebDAV 配置（可折叠） -->
    <WebDAVConfigCollapsible
      v-model="localWebDAVConfig"
      :testing="webdavTesting"
      @save="handleSave"
      @test="handleTestWebDAV"
    />
  </div>
</template>

<style scoped>
@import '../../styles/settings-shared.css';

.backup-sync-panel {
  padding: 0;
}

/* 标题区融合状态 */
.section-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.header-left h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

/* 分组标题 */
.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 16px;
  margin-bottom: 12px;
}

</style>
