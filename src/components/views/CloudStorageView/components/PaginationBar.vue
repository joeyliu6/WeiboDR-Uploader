<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';

const props = defineProps<{
  currentPage: number;
  pageSize: number;
  totalItems: number;
  selectedCount: number;
  hasMore: boolean;
  loading: boolean;
  maxKnownPage: number;
  pageSizeOptions: number[];
}>();

const emit = defineEmits<{
  'page-change': [page: number];
  'page-size-change': [size: number];
}>();

const jumpPage = ref<number | null>(null);

// 每页条数选项格式化
const pageSizeSelectOptions = computed(() =>
  props.pageSizeOptions.map((size) => ({ label: `${size} 条/页`, value: size }))
);

// 页码显示逻辑
interface PageItem {
  type: 'page' | 'ellipsis';
  page?: number;
}

const pageNumbers = computed<PageItem[]>(() => {
  const items: PageItem[] = [];
  const current = props.currentPage;
  const max = props.maxKnownPage;
  const showEllipsisThreshold = 7;

  if (max <= showEllipsisThreshold) {
    for (let i = 1; i <= max; i++) {
      items.push({ type: 'page', page: i });
    }
    if (props.hasMore && max === current) {
      items.push({ type: 'ellipsis' });
    }
  } else {
    items.push({ type: 'page', page: 1 });

    if (current > 4) {
      items.push({ type: 'ellipsis' });
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(max - 1, current + 1);
    for (let i = start; i <= end; i++) {
      items.push({ type: 'page', page: i });
    }

    if (current < max - 3) {
      items.push({ type: 'ellipsis' });
    }

    items.push({ type: 'page', page: max });

    if (props.hasMore && max === current) {
      items.push({ type: 'ellipsis' });
    }
  }

  return items;
});

const canGoPrev = computed(() => props.currentPage > 1 && !props.loading);
const canGoNext = computed(() => props.hasMore && !props.loading);

function handlePrev() {
  if (canGoPrev.value) {
    emit('page-change', props.currentPage - 1);
  }
}

function handleNext() {
  if (canGoNext.value) {
    emit('page-change', props.currentPage + 1);
  }
}

function handleGoTo(page: number) {
  if (page !== props.currentPage && !props.loading) {
    emit('page-change', page);
  }
}

function handleJump() {
  if (jumpPage.value && jumpPage.value > 0 && !props.loading) {
    emit('page-change', jumpPage.value);
    jumpPage.value = null;
  }
}

function handlePageSizeChange(event: { value: number }) {
  emit('page-size-change', event.value);
}

watch(
  () => props.currentPage,
  () => {
    jumpPage.value = null;
  }
);
</script>

<template>
  <div class="pagination-bar">
    <!-- 左侧统计 -->
    <div class="stats-section">
      <span class="total-info">
        共 <span class="count">{{ totalItems }}</span> 项
      </span>
      <Transition name="fade">
        <span v-if="selectedCount > 0" class="selected-info">
          已选 <span class="count">{{ selectedCount }}</span> 项
        </span>
      </Transition>
    </div>

    <!-- 右侧分页控制 -->
    <div class="pagination-controls">
      <!-- 每页条数 -->
      <div class="page-size-select">
        <Select
          :modelValue="pageSize"
          :options="pageSizeSelectOptions"
          optionLabel="label"
          optionValue="value"
          :disabled="loading"
          @change="handlePageSizeChange"
          class="size-dropdown"
        />
      </div>

      <div class="divider"></div>

      <!-- 页码导航 -->
      <div class="page-nav">
        <Button
          icon="pi pi-angle-left"
          :disabled="!canGoPrev"
          @click="handlePrev"
          text
          rounded
          size="small"
          class="nav-btn"
          aria-label="上一页"
        />

        <div class="page-numbers">
          <template v-for="(item, index) in pageNumbers" :key="index">
            <span v-if="item.type === 'ellipsis'" class="ellipsis">...</span>
            <Button
              v-else
              :label="String(item.page)"
              :class="['page-btn', { active: item.page === currentPage }]"
              :disabled="loading"
              @click="handleGoTo(item.page!)"
              text
              size="small"
            />
          </template>
        </div>

        <Button
          icon="pi pi-angle-right"
          :disabled="!canGoNext"
          @click="handleNext"
          text
          rounded
          size="small"
          class="nav-btn"
          aria-label="下一页"
        />
      </div>

      <div class="divider"></div>

      <!-- 跳转输入 -->
      <div class="page-jump">
        <span class="label">跳至</span>
        <InputNumber
          v-model="jumpPage"
          :min="1"
          :disabled="loading"
          :useGrouping="false"
          @keyup.enter="handleJump"
          class="jump-input"
          inputClass="jump-input-field"
        />
        <span class="label">页</span>
        <Button
          label="GO"
          size="small"
          :disabled="loading || !jumpPage"
          @click="handleJump"
          class="go-btn"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
  background: var(--bg-card);
}

/* 左侧统计 */
.stats-section {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.stats-section .count {
  font-weight: 600;
  color: var(--text-primary);
}

.selected-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(var(--primary-rgb, 59, 130, 246), 0.1);
  border-radius: 4px;
  color: var(--primary);
}

.selected-info .count {
  color: var(--primary);
}

/* 右侧分页控制 */
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--border-subtle);
}

/* 每页条数选择 */
.page-size-select {
  display: flex;
  align-items: center;
}

.page-size-select :deep(.size-dropdown) {
  width: 110px;
}

.page-size-select :deep(.p-select) {
  height: 32px;
  font-size: 13px;
}

/* 页码导航 */
.page-nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 2px;
}

.page-numbers .ellipsis {
  padding: 0 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.page-numbers :deep(.page-btn) {
  min-width: 28px;
  height: 28px;
  padding: 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-radius: 4px;
}

.page-numbers :deep(.page-btn:hover:not(:disabled)) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.page-numbers :deep(.page-btn.active) {
  background: var(--primary);
  color: white;
}

.page-numbers :deep(.page-btn.active:hover) {
  background: var(--primary);
  color: white;
}

:deep(.nav-btn) {
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
}

:deep(.nav-btn:hover:not(:disabled)) {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* 跳转输入 */
.page-jump {
  display: flex;
  align-items: center;
  gap: 6px;
}

.page-jump .label {
  font-size: 13px;
  color: var(--text-muted);
}

.page-jump :deep(.jump-input) {
  width: 56px;
}

.page-jump :deep(.jump-input-field) {
  height: 28px;
  font-size: 13px;
  text-align: center;
  padding: 0 8px;
}

.page-jump :deep(.go-btn) {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
