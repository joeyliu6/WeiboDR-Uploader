<script setup lang="ts">
// 高级设置面板组件 - 整合链接前缀、记录与缓存管理、隐私设置、CDN 加速

import { computed } from 'vue';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import RadioButton from 'primevue/radiobutton';
import Button from 'primevue/button';
import Divider from 'primevue/divider';
import ToggleSwitch from 'primevue/toggleswitch';
import { generatePreviewUrl, validateCdnTemplate } from '../../utils/githubCdn';
import type { GithubCdnConfig } from '../../config/types';
import { DEFAULT_GITHUB_CDN_LIST } from '../../config/types';

// ==================== Props ====================

interface Props {
  /** 是否启用链接前缀 */
  linkPrefixEnabled: boolean;

  /** 前缀列表 */
  prefixList: string[];

  /** 选中的前缀索引 */
  selectedPrefixIndex: number;

  /** 是否启用数据分析 */
  analyticsEnabled: boolean;

  /** 是否正在清理缓存 */
  isClearingCache: boolean;

  /** GitHub CDN 配置 */
  githubCdnConfig?: GithubCdnConfig;
}

const props = defineProps<Props>();

// ==================== Emits ====================

const emit = defineEmits<{
  /** 链接前缀启用状态变更 */
  'update:linkPrefixEnabled': [enabled: boolean];

  /** 前缀列表变更 */
  'update:prefixList': [list: string[]];

  /** 选中索引变更 */
  'update:selectedPrefixIndex': [index: number];

  /** 数据分析开关变更 */
  'update:analyticsEnabled': [enabled: boolean];

  /** GitHub CDN 配置变更 */
  'update:githubCdnConfig': [config: GithubCdnConfig];

  /** 清空历史记录 */
  'clearHistory': [];

  /** 清理缓存 */
  'clearCache': [];

  /** 保存设置 */
  'save': [];

  /** 添加前缀 */
  'addPrefix': [];

  /** 删除前缀 */
  'removePrefix': [index: number];

  /** 恢复默认前缀 */
  'resetToDefault': [];
}>();

// ==================== 计算属性 ====================

const localLinkPrefixEnabled = computed({
  get: () => props.linkPrefixEnabled,
  set: (val) => emit('update:linkPrefixEnabled', val)
});

const localSelectedPrefixIndex = computed({
  get: () => props.selectedPrefixIndex,
  set: (val) => emit('update:selectedPrefixIndex', val)
});

const localAnalyticsEnabled = computed({
  get: () => props.analyticsEnabled,
  set: (val) => emit('update:analyticsEnabled', val)
});

// ==================== 方法 ====================

function handlePrefixChange(index: number, value: string) {
  const newList = [...props.prefixList];
  newList[index] = value;
  emit('update:prefixList', newList);
}

// ==================== CDN 相关 ====================

const githubCdnEnabled = computed({
  get: () => props.githubCdnConfig?.enabled ?? false,
  set: (val) => {
    const newConfig: GithubCdnConfig = props.githubCdnConfig
      ? { ...props.githubCdnConfig, enabled: val }
      : { enabled: val, selectedIndex: 0, cdnList: [...DEFAULT_GITHUB_CDN_LIST] };
    emit('update:githubCdnConfig', newConfig);
    emit('save');
  }
});

const githubCdnSelectedIndex = computed({
  get: () => props.githubCdnConfig?.selectedIndex ?? 0,
  set: (val) => {
    if (props.githubCdnConfig) {
      emit('update:githubCdnConfig', { ...props.githubCdnConfig, selectedIndex: val });
      emit('save');
    }
  }
});

const githubCdnList = computed(() => {
  return props.githubCdnConfig?.cdnList ?? DEFAULT_GITHUB_CDN_LIST;
});

const githubCdnPreviewUrl = computed(() => {
  const cdnConfig = props.githubCdnConfig;
  if (!cdnConfig?.enabled || !cdnConfig.cdnList?.length) {
    return generatePreviewUrl(DEFAULT_GITHUB_CDN_LIST[0].urlTemplate);
  }
  const index = cdnConfig.selectedIndex >= 0 && cdnConfig.selectedIndex < cdnConfig.cdnList.length
    ? cdnConfig.selectedIndex
    : 0;
  return generatePreviewUrl(cdnConfig.cdnList[index].urlTemplate);
});

function updateGithubCdnTemplate(index: number, value: string) {
  if (props.githubCdnConfig?.cdnList) {
    const newCdnList = [...props.githubCdnConfig.cdnList];
    newCdnList[index] = { ...newCdnList[index], urlTemplate: value };
    emit('update:githubCdnConfig', { ...props.githubCdnConfig, cdnList: newCdnList });
  }
}

function addCustomGithubCdn() {
  const currentConfig = props.githubCdnConfig ?? {
    enabled: true,
    selectedIndex: 0,
    cdnList: [...DEFAULT_GITHUB_CDN_LIST]
  };
  const newCdnList = [...currentConfig.cdnList, {
    name: '自定义 CDN',
    urlTemplate: 'https://example.com/gh/{owner}/{repo}@{branch}/{path}',
    isPreset: false
  }];
  emit('update:githubCdnConfig', { ...currentConfig, cdnList: newCdnList });
  emit('save');
}

function removeGithubCdn(index: number) {
  if (props.githubCdnConfig?.cdnList) {
    const cdn = props.githubCdnConfig.cdnList[index];
    if (cdn.isPreset) return;
    const newCdnList = props.githubCdnConfig.cdnList.filter((_, i) => i !== index);
    let newSelectedIndex = props.githubCdnConfig.selectedIndex;
    if (newSelectedIndex >= newCdnList.length) {
      newSelectedIndex = 0;
    }
    emit('update:githubCdnConfig', { ...props.githubCdnConfig, cdnList: newCdnList, selectedIndex: newSelectedIndex });
    emit('save');
  }
}

function resetGithubCdnToDefault() {
  emit('update:githubCdnConfig', {
    enabled: props.githubCdnConfig?.enabled ?? false,
    selectedIndex: 0,
    cdnList: [...DEFAULT_GITHUB_CDN_LIST]
  });
  emit('save');
}

function isCdnTemplateValid(template: string): boolean {
  return validateCdnTemplate(template);
}
</script>

<template>
  <div class="advanced-settings-panel">
    <div class="section-header">
      <h2>高级设置</h2>
      <p class="section-desc">链接前缀、记录管理与隐私设置。</p>
    </div>

    <!-- 链接前缀 -->
    <div class="form-group">
      <label class="group-label">链接前缀</label>
      <p class="helper-text">为微博图片添加代理前缀以绕过防盗链限制。</p>

      <div class="flex items-center gap-2 mb-3">
        <Checkbox
          v-model="localLinkPrefixEnabled"
          :binary="true"
          inputId="prefix-enable"
          @change="emit('save')"
        />
        <label for="prefix-enable" class="font-medium cursor-pointer">启用链接前缀</label>
      </div>

      <div v-if="linkPrefixEnabled" class="prefix-list">
        <div v-for="(prefix, idx) in prefixList" :key="idx" class="prefix-row">
          <RadioButton
            v-model="localSelectedPrefixIndex"
            :value="idx"
            :inputId="'p-' + idx"
            @change="emit('save')"
          />
          <InputText
            :modelValue="prefix"
            @update:modelValue="(val) => handlePrefixChange(idx, val as string)"
            @blur="emit('save')"
            class="flex-1"
          />
          <Button
            icon="pi pi-trash"
            @click="emit('removePrefix', idx)"
            text
            severity="danger"
            :disabled="prefixList.length <= 1"
          />
        </div>
        <div class="flex gap-2 mt-2">
          <Button
            label="添加新前缀"
            icon="pi pi-plus"
            @click="emit('addPrefix')"
            outlined
            size="small"
          />
          <Button
            label="恢复默认前缀"
            icon="pi pi-refresh"
            @click="emit('resetToDefault')"
            outlined
            severity="secondary"
            size="small"
          />
        </div>
      </div>
    </div>

    <Divider />

    <!-- GitHub CDN 加速 -->
    <div class="form-group">
      <label class="group-label">GitHub CDN 加速</label>
      <p class="helper-text">使用第三方 CDN 加速 GitHub 图片访问，提升国内访问速度。</p>

      <div class="flex items-center gap-2 mb-3">
        <Checkbox
          v-model="githubCdnEnabled"
          :binary="true"
          inputId="cdn-enable"
        />
        <label for="cdn-enable" class="font-medium cursor-pointer">启用 CDN 加速</label>
      </div>

      <div v-if="githubCdnEnabled" class="cdn-list">
        <div v-for="(cdn, idx) in githubCdnList" :key="idx" class="cdn-row">
          <RadioButton
            v-model="githubCdnSelectedIndex"
            :value="idx"
            :inputId="'cdn-' + idx"
          />
          <template v-if="cdn.isPreset">
            <label :for="'cdn-' + idx" class="cdn-name">{{ cdn.name }}</label>
          </template>
          <template v-else>
            <InputText
              :modelValue="cdn.urlTemplate"
              @update:modelValue="(val) => updateGithubCdnTemplate(idx, val as string)"
              @blur="emit('save')"
              class="flex-1"
              :class="{ 'p-invalid': !isCdnTemplateValid(cdn.urlTemplate) }"
              placeholder="https://example.com/gh/{owner}/{repo}@{branch}/{path}"
            />
            <Button
              icon="pi pi-times"
              @click="removeGithubCdn(idx)"
              text
              severity="danger"
            />
          </template>
        </div>
        <div class="flex gap-2 mt-2">
          <Button
            label="添加自定义"
            icon="pi pi-plus"
            @click="addCustomGithubCdn"
            outlined
            size="small"
          />
          <Button
            label="恢复默认"
            icon="pi pi-refresh"
            @click="resetGithubCdnToDefault"
            outlined
            severity="secondary"
            size="small"
          />
        </div>
        <div class="cdn-preview">
          <span class="cdn-preview-label">预览</span>
          <code>{{ githubCdnPreviewUrl }}</code>
        </div>
      </div>
    </div>

    <Divider />

    <!-- 记录与缓存管理 -->
    <div class="form-group">
      <label class="group-label">记录与缓存管理</label>
      <p class="helper-text">管理上传历史记录和应用缓存。</p>
      <div class="flex gap-2 flex-wrap">
        <Button
          label="清空历史记录"
          icon="pi pi-trash"
          severity="danger"
          outlined
          @click="emit('clearHistory')"
        />
        <Button
          label="清理应用缓存"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="emit('clearCache')"
          :loading="isClearingCache"
        />
      </div>
    </div>

    <Divider />

    <!-- 隐私设置 -->
    <div class="form-group">
      <label class="group-label">隐私设置</label>
      <p class="helper-text">管理应用使用数据的收集。</p>

      <div class="privacy-setting">
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">使用数据收集</span>
            <span class="setting-desc">
              允许发送匿名使用统计，帮助改进应用。不收集任何个人信息或上传内容。
            </span>
          </div>
          <ToggleSwitch
            v-model="localAnalyticsEnabled"
            @change="emit('save')"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/settings-shared.css';

/* 前缀列表 */
.prefix-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prefix-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 隐私设置 */
.privacy-setting {
  background: var(--selected-bg);
  border: 1px solid var(--primary-border);
  border-radius: 8px;
  padding: 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 13px;
  color: var(--text-muted);
}

/* CDN 列表样式 */
.cdn-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cdn-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cdn-name {
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}

.cdn-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 10px;
  background: var(--surface-section);
  border-radius: 4px;
}

.cdn-preview-label {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.cdn-preview code {
  font-size: 11px;
  color: var(--text-secondary);
  word-break: break-all;
  font-family: 'SF Mono', 'Consolas', monospace;
}
</style>
