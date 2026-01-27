<script setup lang="ts">
import { computed } from 'vue';
import ToggleSwitch from 'primevue/toggleswitch';
import Select from 'primevue/select';
import type { AutoSyncConfig } from '../../../config/types';

interface IntervalOption {
  label: string;
  value: number;
}

interface Props {
  config: AutoSyncConfig;
  isCloudEnabled: boolean;
  intervalOptions: IntervalOption[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:enabled': [value: boolean];
  'update:interval': [value: number];
}>();

const enabled = computed({
  get: () => props.config.enabled,
  set: (val) => emit('update:enabled', val)
});

const selectedInterval = computed({
  get: () => {
    const hours = props.config.intervalHours;
    const preset = props.intervalOptions.find(opt => opt.value === hours);
    return preset ? hours : props.intervalOptions[0]?.value || 24;
  },
  set: (val) => emit('update:interval', val)
});
</script>

<template>
  <div class="sync-item-row">
    <!-- 左侧：信息 -->
    <div class="item-left">
      <div class="item-info">
        <div class="item-title">自动同步</div>
        <div class="item-desc">定时自动备份配置和历史记录</div>
      </div>
    </div>

    <!-- 右侧：下拉框 + 开关 -->
    <div class="item-right">
      <div class="auto-sync-controls">
        <Select
          v-model="selectedInterval"
          :options="intervalOptions"
          :disabled="!isCloudEnabled || !enabled"
          optionLabel="label"
          optionValue="value"
          class="interval-dropdown"
        />
        <ToggleSwitch
          v-model="enabled"
          :disabled="!isCloudEnabled"
          :title="!isCloudEnabled ? '请先配置 WebDAV' : ''"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sync-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
  gap: 16px;
  transition: background-color 0.15s;
  margin: 0 -16px;
  padding-left: 16px;
  padding-right: 16px;
}

.sync-item-row:hover {
  background: var(--primary-hover-bg);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.item-info {
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.item-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.item-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.auto-sync-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.interval-dropdown {
  min-width: 100px;
}
</style>
