# PicNexus 时间轴功能开发文档

> 为 PicNexus 添加类似 Google 相册的时间轴浏览功能

---

## 目录

1. [功能概述](#1-功能概述)
2. [设计参考](#2-设计参考)
3. [技术架构](#3-技术架构)
4. [数据模型设计](#4-数据模型设计)
5. [组件设计](#5-组件设计)
6. [实现步骤](#6-实现步骤)
7. [核心代码示例](#7-核心代码示例)
8. [性能优化](#8-性能优化)
9. [测试要点](#9-测试要点)

---

## 1. 功能概述

### 1.1 目标

在现有历史记录功能基础上，添加时间轴视图，让用户能够：

- 按时间（年/月/日）浏览上传的图片
- 快速定位到特定时间段
- 流畅滚动查看大量图片
- 支持图片预览和批量操作

### 1.2 核心特性

| 特性 | 描述 |
|------|------|
| **时间分组** | 按日期自动分组，显示「2024年1月」「今天」「昨天」等标签 |
| **虚拟滚动** | 支持数千张图片流畅滚动，无性能问题 |
| **快速导航** | 右侧时间轴滑块，拖动快速跳转 |
| **响应式网格** | 根据窗口宽度自动调整每行图片数量 |
| **懒加载** | 仅加载可见区域的图片缩略图 |
| **多选操作** | 支持 Shift/Ctrl 多选，批量复制链接或删除 |

---

## 2. 设计参考

### 2.1 Google 相册时间轴特点

```
┌─────────────────────────────────────────────────────────┐
│  ← 返回    时间轴                           🔍 筛选     │
├─────────────────────────────────────────────────────────┤
│                                                    ▲    │
│  2024年1月15日 · 今天                              │    │
│  ┌────┬────┬────┬────┬────┬────┐                  │    │
│  │    │    │    │    │    │    │                  │    │
│  │img1│img2│img3│img4│img5│img6│                  2024  │
│  │    │    │    │    │    │    │                  │    │
│  └────┴────┴────┴────┴────┴────┘                  │    │
│                                                    │    │
│  2024年1月14日 · 昨天                              │    │
│  ┌────┬────┬────┬────┐                            │    │
│  │    │    │    │    │                            │    │
│  │img7│img8│img9│i10 │                            │    │
│  │    │    │    │    │                            ▼    │
│  └────┴────┴────┴────┘                                 │
│                                                         │
│  2024年1月10日                                          │
│  ┌────┬────┐                                           │
│  │    │    │                                           │
│  │i11 │i12 │                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 交互设计要点

1. **粘性日期标题**：滚动时当前日期固定在顶部
2. **平滑过渡**：日期标题切换时有淡入淡出效果
3. **时间轴滑块**：
   - 显示年份刻度
   - 拖动时显示具体日期预览
   - 松开后平滑滚动到目标位置
4. **图片悬停效果**：显示选择框和上传信息

---

## 3. 技术架构

### 3.1 技术栈适配

基于 PicNexus 现有技术栈：

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | 组件开发 |
| 状态管理 | Pinia（推荐）或 Vue Composition API | 管理图片数据和视图状态 |
| 虚拟滚动 | `vue-virtual-scroller` 或自实现 | 大量图片性能优化 |
| 后端 | Tauri (Rust) | 数据库操作、文件系统访问 |
| 数据库 | SQLite（通过 Tauri） | 存储上传历史 |
| 样式 | CSS/SCSS | 响应式布局 |

### 3.2 目录结构建议

```
src/
├── components/
│   └── timeline/
│       ├── TimelineView.vue          # 主视图容器
│       ├── TimelineDateGroup.vue     # 日期分组组件
│       ├── TimelineImageGrid.vue     # 图片网格组件
│       ├── TimelineImage.vue         # 单个图片组件
│       ├── TimelineScrubber.vue      # 右侧时间轴滑块
│       ├── TimelineStickyHeader.vue  # 粘性日期标题
│       └── index.ts                  # 导出
├── composables/
│   ├── useTimelineData.ts            # 数据获取和处理
│   ├── useVirtualScroll.ts           # 虚拟滚动逻辑
│   ├── useImageSelection.ts          # 图片选择逻辑
│   └── useTimelineNavigation.ts      # 导航逻辑
├── stores/
│   └── timelineStore.ts              # Pinia store
├── types/
│   └── timeline.ts                   # 类型定义
└── utils/
    └── dateUtils.ts                  # 日期处理工具
```

---

## 4. 数据模型设计

### 4.1 TypeScript 类型定义

```typescript
// src/types/timeline.ts

/**
 * 上传记录（对应数据库记录）
 */
export interface UploadRecord {
  id: string;                    // 唯一标识
  originalName: string;          // 原始文件名
  thumbnailPath: string;         // 本地缩略图路径
  uploadTime: number;            // 上传时间戳 (ms)
  fileSize: number;              // 文件大小 (bytes)
  width: number;                 // 图片宽度
  height: number;                // 图片高度
  
  // 各图床上传结果
  uploadResults: UploadResult[];
}

export interface UploadResult {
  platform: ImageHostPlatform;   // 图床平台
  url: string;                   // 图片链接
  success: boolean;              // 是否成功
  uploadedAt: number;            // 上传时间
}

export type ImageHostPlatform = 
  | 'tcl' 
  | 'jd' 
  | 'qiyu' 
  | 'weibo' 
  | 'zhihu' 
  | 'nowcoder' 
  | 'nami' 
  | 'r2';

/**
 * 按日期分组的数据结构
 */
export interface TimelineDateGroup {
  date: string;                  // 日期 key，如 "2024-01-15"
  displayLabel: string;          // 显示文本，如 "今天" / "2024年1月15日"
  images: UploadRecord[];        // 该日期的图片列表
  height?: number;               // 计算后的组高度（用于虚拟滚动）
}

/**
 * 时间轴视图状态
 */
export interface TimelineViewState {
  groups: TimelineDateGroup[];   // 所有日期分组
  selectedIds: Set<string>;      // 已选中的图片 ID
  currentDate: string | null;    // 当前可见的日期
  isLoading: boolean;
  error: string | null;
  
  // 虚拟滚动状态
  scrollTop: number;
  visibleRange: {
    startIndex: number;
    endIndex: number;
  };
}

/**
 * 时间轴滑块数据
 */
export interface ScrubberMark {
  date: string;                  // 日期
  label: string;                 // 显示标签（年/月）
  position: number;              // 位置百分比 0-100
  groupIndex: number;            // 对应的分组索引
}
```

### 4.2 数据库 Schema 扩展

如果需要扩展现有数据库，建议添加索引优化时间查询：

```sql
-- 为上传时间添加索引（如果尚未存在）
CREATE INDEX IF NOT EXISTS idx_upload_time ON upload_history(upload_time DESC);

-- 可选：添加缩略图路径字段
ALTER TABLE upload_history ADD COLUMN thumbnail_path TEXT;
```

### 4.3 Rust 后端数据结构

```rust
// src-tauri/src/models/timeline.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadRecord {
    pub id: String,
    pub original_name: String,
    pub thumbnail_path: Option<String>,
    pub upload_time: i64,
    pub file_size: i64,
    pub width: u32,
    pub height: u32,
    pub upload_results: Vec<UploadResult>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UploadResult {
    pub platform: String,
    pub url: String,
    pub success: bool,
    pub uploaded_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineQuery {
    pub start_date: Option<i64>,  // 起始时间戳
    pub end_date: Option<i64>,    // 结束时间戳
    pub limit: Option<u32>,       // 每页数量
    pub offset: Option<u32>,      // 偏移量
}
```

---

## 5. 组件设计

### 5.1 组件层级结构

```
TimelineView (主容器)
├── TimelineStickyHeader (粘性日期标题)
├── VirtualScrollContainer (虚拟滚动容器)
│   └── TimelineDateGroup (日期分组) × N
│       ├── DateHeader (日期标题)
│       └── TimelineImageGrid (图片网格)
│           └── TimelineImage (图片项) × N
└── TimelineScrubber (右侧时间轴滑块)
```

### 5.2 组件职责

| 组件 | 职责 |
|------|------|
| `TimelineView` | 整体布局、数据获取、协调子组件 |
| `TimelineStickyHeader` | 固定在顶部的日期标题，随滚动更新 |
| `TimelineDateGroup` | 单个日期分组的容器 |
| `TimelineImageGrid` | 响应式图片网格布局 |
| `TimelineImage` | 单个图片：缩略图、选择框、悬停效果 |
| `TimelineScrubber` | 右侧时间轴快速导航滑块 |

### 5.3 组件通信

```
┌─────────────────────────────────────────────────────────┐
│                    Pinia Store                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ state: groups, selectedIds, currentDate, etc.    │  │
│  │ actions: loadData, selectImage, scrollToDate     │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────────────┬─┘
                │                                       │
                ▼                                       ▼
┌───────────────────────────┐       ┌───────────────────────────┐
│      TimelineView         │       │    TimelineScrubber       │
│  - 订阅 store 数据        │◄─────►│  - 显示时间轴刻度         │
│  - 提供滚动容器 ref       │       │  - 拖动时 emit 目标日期   │
└───────────────────────────┘       └───────────────────────────┘
                │
                ▼
┌───────────────────────────┐
│   TimelineDateGroup       │
│  - 接收 group prop        │
│  - 管理内部图片渲染       │
└───────────────────────────┘
                │
                ▼
┌───────────────────────────┐
│     TimelineImage         │
│  - 接收 image prop        │
│  - emit select 事件       │
└───────────────────────────┘
```

---

## 6. 实现步骤

### 阶段一：基础框架（预计 2-3 天）

- [ ] **Step 1**: 创建类型定义文件 `src/types/timeline.ts`
- [ ] **Step 2**: 创建 Pinia store `src/stores/timelineStore.ts`
- [ ] **Step 3**: 实现日期工具函数 `src/utils/dateUtils.ts`
- [ ] **Step 4**: 创建基础 `TimelineView.vue` 组件
- [ ] **Step 5**: 添加路由和导航入口

### 阶段二：核心组件（预计 3-4 天）

- [ ] **Step 6**: 实现 `TimelineDateGroup.vue`
- [ ] **Step 7**: 实现 `TimelineImageGrid.vue` 响应式网格
- [ ] **Step 8**: 实现 `TimelineImage.vue` 图片组件
- [ ] **Step 9**: 实现图片懒加载
- [ ] **Step 10**: 添加图片选择功能

### 阶段三：高级特性（预计 3-4 天）

- [ ] **Step 11**: 实现虚拟滚动
- [ ] **Step 12**: 实现 `TimelineStickyHeader.vue`
- [ ] **Step 13**: 实现 `TimelineScrubber.vue` 时间轴滑块
- [ ] **Step 14**: 添加拖动快速导航功能

### 阶段四：优化和完善（预计 2-3 天）

- [ ] **Step 15**: 性能优化（防抖、节流、缓存）
- [ ] **Step 16**: 添加加载状态和错误处理
- [ ] **Step 17**: 响应式适配（移动端/桌面端）
- [ ] **Step 18**: 添加动画过渡效果
- [ ] **Step 19**: 测试和 Bug 修复

---

## 7. 核心代码示例

### 7.1 Pinia Store

```typescript
// src/stores/timelineStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/tauri';
import type { UploadRecord, TimelineDateGroup, TimelineViewState } from '@/types/timeline';
import { groupByDate, formatDateLabel } from '@/utils/dateUtils';

export const useTimelineStore = defineStore('timeline', () => {
  // State
  const records = ref<UploadRecord[]>([]);
  const selectedIds = ref<Set<string>>(new Set());
  const currentDate = ref<string | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const groups = computed<TimelineDateGroup[]>(() => {
    const grouped = groupByDate(records.value);
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a)) // 降序排列
      .map(([date, images]) => ({
        date,
        displayLabel: formatDateLabel(date),
        images,
      }));
  });

  const selectedCount = computed(() => selectedIds.value.size);

  const selectedImages = computed(() => 
    records.value.filter(r => selectedIds.value.has(r.id))
  );

  // Actions
  async function loadRecords(query?: { startDate?: number; endDate?: number }) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const data = await invoke<UploadRecord[]>('get_upload_history', { query });
      records.value = data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
      console.error('Failed to load timeline data:', e);
    } finally {
      isLoading.value = false;
    }
  }

  function selectImage(id: string, multiSelect = false) {
    if (multiSelect) {
      if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
      } else {
        selectedIds.value.add(id);
      }
    } else {
      selectedIds.value.clear();
      selectedIds.value.add(id);
    }
  }

  function selectRange(startId: string, endId: string) {
    const startIndex = records.value.findIndex(r => r.id === startId);
    const endIndex = records.value.findIndex(r => r.id === endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [from, to] = startIndex < endIndex 
      ? [startIndex, endIndex] 
      : [endIndex, startIndex];
    
    for (let i = from; i <= to; i++) {
      selectedIds.value.add(records.value[i].id);
    }
  }

  function clearSelection() {
    selectedIds.value.clear();
  }

  function selectAll() {
    records.value.forEach(r => selectedIds.value.add(r.id));
  }

  function setCurrentDate(date: string | null) {
    currentDate.value = date;
  }

  return {
    // State
    records,
    selectedIds,
    currentDate,
    isLoading,
    error,
    // Getters
    groups,
    selectedCount,
    selectedImages,
    // Actions
    loadRecords,
    selectImage,
    selectRange,
    clearSelection,
    selectAll,
    setCurrentDate,
  };
});
```

### 7.2 日期工具函数

```typescript
// src/utils/dateUtils.ts

import type { UploadRecord } from '@/types/timeline';

/**
 * 将时间戳转换为日期 key
 */
export function timestampToDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // "2024-01-15"
}

/**
 * 按日期分组
 */
export function groupByDate(records: UploadRecord[]): Record<string, UploadRecord[]> {
  return records.reduce((groups, record) => {
    const dateKey = timestampToDateKey(record.uploadTime);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(record);
    return groups;
  }, {} as Record<string, UploadRecord[]>);
}

/**
 * 格式化日期标签
 */
export function formatDateLabel(dateKey: string): string {
  const date = new Date(dateKey);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) {
    return '今天';
  }
  if (target.getTime() === yesterday.getTime()) {
    return '昨天';
  }
  
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  if (isThisYear) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
  
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return formatDateLabel(timestampToDateKey(timestamp));
}

/**
 * 生成时间轴刻度数据
 */
export function generateScrubberMarks(
  groups: { date: string }[]
): { date: string; label: string; position: number }[] {
  if (groups.length === 0) return [];
  
  const marks: { date: string; label: string; position: number }[] = [];
  let lastYear = '';
  let lastMonth = '';
  
  groups.forEach((group, index) => {
    const date = new Date(group.date);
    const year = date.getFullYear().toString();
    const month = `${year}-${date.getMonth() + 1}`;
    const position = (index / (groups.length - 1)) * 100;
    
    // 每年添加年份标记
    if (year !== lastYear) {
      marks.push({
        date: group.date,
        label: year,
        position,
      });
      lastYear = year;
      lastMonth = month;
    }
    // 每月添加月份标记（可选，避免太密集）
    else if (month !== lastMonth && groups.length < 100) {
      marks.push({
        date: group.date,
        label: `${date.getMonth() + 1}月`,
        position,
      });
      lastMonth = month;
    }
  });
  
  return marks;
}
```

### 7.3 主视图组件

```vue
<!-- src/components/timeline/TimelineView.vue -->
<template>
  <div class="timeline-view">
    <!-- 粘性日期标题 -->
    <TimelineStickyHeader 
      :date="currentDateLabel" 
      :visible="showStickyHeader"
    />

    <!-- 工具栏 -->
    <div class="timeline-toolbar">
      <div class="selection-info" v-if="selectedCount > 0">
        已选择 {{ selectedCount }} 张图片
        <button @click="clearSelection">取消选择</button>
        <button @click="copySelectedLinks">复制链接</button>
      </div>
      <div class="view-options">
        <button @click="toggleGridSize">
          {{ gridSize === 'small' ? '大图' : '小图' }}
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div 
      ref="scrollContainer"
      class="timeline-scroll-container"
      @scroll="handleScroll"
    >
      <div class="timeline-content" :style="{ height: totalHeight + 'px' }">
        <template v-for="(group, index) in visibleGroups" :key="group.date">
          <TimelineDateGroup
            :group="group"
            :style="{ transform: `translateY(${group.offsetTop}px)` }"
            :grid-size="gridSize"
            :selected-ids="selectedIds"
            @select="handleImageSelect"
            @preview="handleImagePreview"
          />
        </template>
      </div>
    </div>

    <!-- 时间轴滑块 -->
    <TimelineScrubber
      :marks="scrubberMarks"
      :current-position="scrubberPosition"
      @seek="handleScrubberSeek"
    />

    <!-- 加载状态 -->
    <div v-if="isLoading" class="timeline-loading">
      <span class="spinner"></span>
      加载中...
    </div>

    <!-- 空状态 -->
    <div v-if="!isLoading && groups.length === 0" class="timeline-empty">
      <p>暂无上传记录</p>
      <p>上传图片后将在这里显示</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useTimelineStore } from '@/stores/timelineStore';
import { useVirtualScroll } from '@/composables/useVirtualScroll';
import { generateScrubberMarks } from '@/utils/dateUtils';
import TimelineStickyHeader from './TimelineStickyHeader.vue';
import TimelineDateGroup from './TimelineDateGroup.vue';
import TimelineScrubber from './TimelineScrubber.vue';

const store = useTimelineStore();
const { groups, selectedIds, selectedCount, currentDate, isLoading } = storeToRefs(store);

// 滚动容器
const scrollContainer = ref<HTMLElement | null>(null);

// 网格大小
const gridSize = ref<'small' | 'large'>('small');

// 虚拟滚动
const {
  visibleGroups,
  totalHeight,
  scrubberPosition,
  updateScroll,
  scrollToGroup,
} = useVirtualScroll(groups, scrollContainer, { gridSize });

// 粘性标题
const showStickyHeader = ref(false);
const currentDateLabel = computed(() => {
  const group = groups.value.find(g => g.date === currentDate.value);
  return group?.displayLabel || '';
});

// 时间轴刻度
const scrubberMarks = computed(() => generateScrubberMarks(groups.value));

// 滚动处理
function handleScroll(e: Event) {
  const target = e.target as HTMLElement;
  updateScroll(target.scrollTop);
  showStickyHeader.value = target.scrollTop > 50;
}

// 图片选择
function handleImageSelect(id: string, event: MouseEvent) {
  if (event.shiftKey && store.selectedIds.size > 0) {
    const lastSelected = Array.from(store.selectedIds).pop()!;
    store.selectRange(lastSelected, id);
  } else {
    store.selectImage(id, event.ctrlKey || event.metaKey);
  }
}

// 图片预览
function handleImagePreview(image: UploadRecord) {
  // 打开图片预览弹窗
  console.log('Preview:', image);
}

// 时间轴滑块跳转
function handleScrubberSeek(date: string) {
  const index = groups.value.findIndex(g => g.date === date);
  if (index !== -1) {
    scrollToGroup(index);
  }
}

// 复制选中图片链接
function copySelectedLinks() {
  const links = store.selectedImages
    .flatMap(img => img.uploadResults.filter(r => r.success).map(r => r.url))
    .join('\n');
  navigator.clipboard.writeText(links);
}

// 清除选择
function clearSelection() {
  store.clearSelection();
}

// 切换网格大小
function toggleGridSize() {
  gridSize.value = gridSize.value === 'small' ? 'large' : 'small';
}

// 初始化
onMounted(() => {
  store.loadRecords();
});
</script>

<style scoped lang="scss">
.timeline-view {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.timeline-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  
  .selection-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.timeline-scroll-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.timeline-content {
  position: relative;
  width: 100%;
}

.timeline-loading,
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--text-secondary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

### 7.4 日期分组组件

```vue
<!-- src/components/timeline/TimelineDateGroup.vue -->
<template>
  <div class="timeline-date-group" :data-date="group.date">
    <!-- 日期标题 -->
    <div class="date-header">
      <h3>{{ group.displayLabel }}</h3>
      <span class="image-count">{{ group.images.length }} 张图片</span>
    </div>

    <!-- 图片网格 -->
    <div 
      class="image-grid" 
      :class="[`grid-${gridSize}`]"
    >
      <TimelineImage
        v-for="image in group.images"
        :key="image.id"
        :image="image"
        :selected="selectedIds.has(image.id)"
        @select="(e) => $emit('select', image.id, e)"
        @preview="$emit('preview', image)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimelineDateGroup } from '@/types/timeline';
import TimelineImage from './TimelineImage.vue';

defineProps<{
  group: TimelineDateGroup;
  gridSize: 'small' | 'large';
  selectedIds: Set<string>;
}>();

defineEmits<{
  select: [id: string, event: MouseEvent];
  preview: [image: UploadRecord];
}>();
</script>

<style scoped lang="scss">
.timeline-date-group {
  padding: 0 16px 24px;
}

.date-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 16px 0 12px;
  position: sticky;
  top: 0;
  background: var(--bg-primary);
  z-index: 10;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .image-count {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.image-grid {
  display: grid;
  gap: 4px;

  &.grid-small {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  &.grid-large {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }
}
</style>
```

### 7.5 图片组件

```vue
<!-- src/components/timeline/TimelineImage.vue -->
<template>
  <div 
    class="timeline-image"
    :class="{ selected }"
    @click="handleClick"
    @dblclick="$emit('preview', image)"
  >
    <!-- 缩略图 -->
    <div class="thumbnail-wrapper">
      <img
        v-if="isVisible"
        :src="thumbnailSrc"
        :alt="image.originalName"
        loading="lazy"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div v-else class="placeholder"></div>
      
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-overlay">
        <span class="spinner-small"></span>
      </div>
    </div>

    <!-- 选择框 -->
    <div 
      class="select-checkbox"
      :class="{ visible: selected || isHovered }"
      @click.stop="handleSelect"
    >
      <svg v-if="selected" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    </div>

    <!-- 悬停信息 -->
    <div class="hover-info" v-if="isHovered">
      <span class="filename">{{ image.originalName }}</span>
      <span class="platforms">
        <span 
          v-for="result in successfulUploads" 
          :key="result.platform"
          class="platform-badge"
        >
          {{ result.platform }}
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useIntersectionObserver } from '@vueuse/core';
import type { UploadRecord } from '@/types/timeline';

const props = defineProps<{
  image: UploadRecord;
  selected: boolean;
}>();

const emit = defineEmits<{
  select: [event: MouseEvent];
  preview: [image: UploadRecord];
}>();

const imageRef = ref<HTMLElement | null>(null);
const isVisible = ref(false);
const isLoading = ref(true);
const isHovered = ref(false);
const hasError = ref(false);

// 懒加载
useIntersectionObserver(
  imageRef,
  ([{ isIntersecting }]) => {
    if (isIntersecting) {
      isVisible.value = true;
    }
  },
  { rootMargin: '100px' }
);

// 缩略图地址
const thumbnailSrc = computed(() => {
  if (props.image.thumbnailPath) {
    return `asset://localhost/${props.image.thumbnailPath}`;
  }
  // 回退到第一个成功的图床链接
  const firstSuccess = props.image.uploadResults.find(r => r.success);
  return firstSuccess?.url || '';
});

// 成功上传的平台
const successfulUploads = computed(() => 
  props.image.uploadResults.filter(r => r.success)
);

function handleClick(e: MouseEvent) {
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    handleSelect(e);
  }
}

function handleSelect(e: MouseEvent) {
  emit('select', e);
}

function onImageLoad() {
  isLoading.value = false;
}

function onImageError() {
  isLoading.value = false;
  hasError.value = true;
}
</script>

<style scoped lang="scss">
.timeline-image {
  position: relative;
  aspect-ratio: 1;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-secondary);

  &:hover {
    .select-checkbox {
      opacity: 1;
    }
    .hover-info {
      opacity: 1;
    }
  }

  &.selected {
    outline: 3px solid var(--primary-color);
    outline-offset: -3px;

    .thumbnail-wrapper::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(var(--primary-rgb), 0.2);
    }
  }
}

.thumbnail-wrapper {
  width: 100%;
  height: 100%;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    background: var(--bg-tertiary);
  }
}

.select-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;

  &.visible {
    opacity: 1;
  }

  svg {
    width: 16px;
    height: 16px;
    color: var(--primary-color);
  }
}

.hover-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.15s ease;

  .filename {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .platforms {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .platform-badge {
    padding: 2px 6px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    font-size: 10px;
    text-transform: uppercase;
  }
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
</style>
```

### 7.6 时间轴滑块组件

```vue
<!-- src/components/timeline/TimelineScrubber.vue -->
<template>
  <div 
    class="timeline-scrubber"
    @mousedown="startDrag"
    @touchstart="startDrag"
  >
    <!-- 轨道 -->
    <div class="scrubber-track" ref="trackRef">
      <!-- 刻度 -->
      <div 
        v-for="mark in marks" 
        :key="mark.date"
        class="scrubber-mark"
        :style="{ top: mark.position + '%' }"
      >
        <span class="mark-label">{{ mark.label }}</span>
      </div>

      <!-- 滑块 -->
      <div 
        class="scrubber-thumb"
        :style="{ top: currentPosition + '%' }"
      >
        <div class="thumb-indicator"></div>
      </div>
    </div>

    <!-- 拖动预览 -->
    <Transition name="fade">
      <div 
        v-if="isDragging && previewDate"
        class="drag-preview"
        :style="{ top: dragPosition + '%' }"
      >
        {{ previewDateLabel }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatDateLabel } from '@/utils/dateUtils';

const props = defineProps<{
  marks: { date: string; label: string; position: number }[];
  currentPosition: number;
}>();

const emit = defineEmits<{
  seek: [date: string];
}>();

const trackRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const dragPosition = ref(0);
const previewDate = ref<string | null>(null);

const previewDateLabel = computed(() => 
  previewDate.value ? formatDateLabel(previewDate.value) : ''
);

function startDrag(e: MouseEvent | TouchEvent) {
  isDragging.value = true;
  updateDragPosition(e);
  
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchmove', onDrag);
  window.addEventListener('touchend', endDrag);
}

function onDrag(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  updateDragPosition(e);
}

function updateDragPosition(e: MouseEvent | TouchEvent) {
  if (!trackRef.value) return;
  
  const rect = trackRef.value.getBoundingClientRect();
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  const position = Math.max(0, Math.min(100, 
    ((clientY - rect.top) / rect.height) * 100
  ));
  
  dragPosition.value = position;
  
  // 找到最近的刻度
  const nearestMark = props.marks.reduce((nearest, mark) => {
    const diff = Math.abs(mark.position - position);
    return diff < Math.abs(nearest.position - position) ? mark : nearest;
  }, props.marks[0]);
  
  if (nearestMark) {
    previewDate.value = nearestMark.date;
  }
}

function endDrag() {
  isDragging.value = false;
  
  if (previewDate.value) {
    emit('seek', previewDate.value);
  }
  
  previewDate.value = null;
  
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', endDrag);
  window.removeEventListener('touchmove', onDrag);
  window.removeEventListener('touchend', endDrag);
}
</script>

<style scoped lang="scss">
.timeline-scrubber {
  position: absolute;
  right: 0;
  top: 60px;
  bottom: 0;
  width: 48px;
  display: flex;
  justify-content: center;
  z-index: 100;
}

.scrubber-track {
  position: relative;
  width: 4px;
  height: 100%;
  background: var(--border-color);
  border-radius: 2px;
}

.scrubber-mark {
  position: absolute;
  right: 12px;
  transform: translateY(-50%);

  .mark-label {
    font-size: 10px;
    color: var(--text-secondary);
    white-space: nowrap;
  }
}

.scrubber-thumb {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  .thumb-indicator {
    width: 12px;
    height: 12px;
    background: var(--primary-color);
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.drag-preview {
  position: absolute;
  right: 24px;
  transform: translateY(-50%);
  padding: 6px 12px;
  background: var(--bg-elevated);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 7.7 虚拟滚动 Composable

```typescript
// src/composables/useVirtualScroll.ts

import { ref, computed, watch, type Ref } from 'vue';
import type { TimelineDateGroup } from '@/types/timeline';

interface VirtualScrollOptions {
  gridSize: Ref<'small' | 'large'>;
  overscan?: number;
}

export function useVirtualScroll(
  groups: Ref<TimelineDateGroup[]>,
  containerRef: Ref<HTMLElement | null>,
  options: VirtualScrollOptions
) {
  const { gridSize, overscan = 3 } = options;

  const scrollTop = ref(0);
  const containerHeight = ref(0);

  // 估算每个分组的高度
  const estimateGroupHeight = (group: TimelineDateGroup): number => {
    const headerHeight = 52; // 日期标题高度
    const gap = 4;
    const itemSize = gridSize.value === 'small' ? 124 : 204;
    const containerWidth = containerRef.value?.clientWidth || 800;
    const itemsPerRow = Math.floor((containerWidth - 32) / itemSize);
    const rows = Math.ceil(group.images.length / itemsPerRow);
    return headerHeight + rows * itemSize + (rows - 1) * gap + 24; // 24 底部间距
  };

  // 计算所有分组的位置
  const groupPositions = computed(() => {
    let offset = 0;
    return groups.value.map((group, index) => {
      const height = estimateGroupHeight(group);
      const position = {
        index,
        offsetTop: offset,
        height,
        group,
      };
      offset += height;
      return position;
    });
  });

  // 总高度
  const totalHeight = computed(() => {
    const positions = groupPositions.value;
    if (positions.length === 0) return 0;
    const last = positions[positions.length - 1];
    return last.offsetTop + last.height;
  });

  // 可见的分组
  const visibleGroups = computed(() => {
    const positions = groupPositions.value;
    const viewTop = scrollTop.value;
    const viewBottom = viewTop + containerHeight.value;

    const visible: (TimelineDateGroup & { offsetTop: number })[] = [];

    for (const pos of positions) {
      const groupTop = pos.offsetTop;
      const groupBottom = groupTop + pos.height;

      // 包含 overscan
      if (groupBottom >= viewTop - pos.height * overscan && 
          groupTop <= viewBottom + pos.height * overscan) {
        visible.push({
          ...pos.group,
          offsetTop: pos.offsetTop,
        });
      }
    }

    return visible;
  });

  // 当前位置百分比（用于时间轴滑块）
  const scrubberPosition = computed(() => {
    if (totalHeight.value === 0) return 0;
    return (scrollTop.value / totalHeight.value) * 100;
  });

  // 当前可见的日期
  const currentVisibleDate = computed(() => {
    const positions = groupPositions.value;
    const viewTop = scrollTop.value + 60; // 考虑顶部偏移

    for (const pos of positions) {
      if (pos.offsetTop + pos.height > viewTop) {
        return pos.group.date;
      }
    }

    return positions[0]?.group.date || null;
  });

  // 更新滚动位置
  function updateScroll(top: number) {
    scrollTop.value = top;
  }

  // 滚动到指定分组
  function scrollToGroup(index: number) {
    const positions = groupPositions.value;
    if (index < 0 || index >= positions.length) return;

    const targetPosition = positions[index].offsetTop;
    containerRef.value?.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
  }

  // 监听容器大小变化
  watch(containerRef, (container) => {
    if (container) {
      containerHeight.value = container.clientHeight;
      
      const observer = new ResizeObserver((entries) => {
        containerHeight.value = entries[0].contentRect.height;
      });
      observer.observe(container);
    }
  }, { immediate: true });

  return {
    visibleGroups,
    totalHeight,
    scrubberPosition,
    currentVisibleDate,
    updateScroll,
    scrollToGroup,
  };
}
```

### 7.8 Rust 后端命令

```rust
// src-tauri/src/commands/timeline.rs

use tauri::command;
use crate::db::Database;
use crate::models::timeline::{UploadRecord, TimelineQuery};

#[command]
pub async fn get_upload_history(
    query: Option<TimelineQuery>,
    db: tauri::State<'_, Database>,
) -> Result<Vec<UploadRecord>, String> {
    let query = query.unwrap_or_default();
    
    let mut sql = String::from(
        "SELECT id, original_name, thumbnail_path, upload_time, 
                file_size, width, height, upload_results
         FROM upload_history"
    );
    
    let mut conditions = Vec::new();
    
    if let Some(start) = query.start_date {
        conditions.push(format!("upload_time >= {}", start));
    }
    
    if let Some(end) = query.end_date {
        conditions.push(format!("upload_time <= {}", end));
    }
    
    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }
    
    sql.push_str(" ORDER BY upload_time DESC");
    
    if let Some(limit) = query.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    
    if let Some(offset) = query.offset {
        sql.push_str(&format!(" OFFSET {}", offset));
    }
    
    db.query_records(&sql)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_timeline_stats(
    db: tauri::State<'_, Database>,
) -> Result<TimelineStats, String> {
    let sql = "
        SELECT 
            COUNT(*) as total_count,
            MIN(upload_time) as earliest,
            MAX(upload_time) as latest
        FROM upload_history
    ";
    
    db.query_stats(sql)
        .map_err(|e| e.to_string())
}

#[derive(serde::Serialize)]
pub struct TimelineStats {
    pub total_count: i64,
    pub earliest: Option<i64>,
    pub latest: Option<i64>,
}
```

---

## 8. 性能优化

### 8.1 图片加载优化

```typescript
// 缩略图生成策略
interface ThumbnailConfig {
  maxWidth: 300,
  maxHeight: 300,
  quality: 0.8,
  format: 'webp' | 'jpeg',
}

// 在上传时生成缩略图（Rust 端）
// 使用 image crate 进行压缩
```

### 8.2 滚动性能优化

| 优化项 | 方法 |
|--------|------|
| **防抖滚动事件** | 使用 `requestAnimationFrame` 或 `lodash.throttle` |
| **CSS 硬件加速** | 使用 `transform` 而非 `top/left` |
| **避免重排** | 固定图片容器尺寸，使用 `aspect-ratio` |
| **图片懒加载** | 使用 `IntersectionObserver` |
| **虚拟滚动** | 仅渲染可见区域 + overscan |

### 8.3 内存优化

```typescript
// 图片 URL 释放
function cleanupImageUrls(urls: string[]) {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}

// 组件卸载时清理
onUnmounted(() => {
  cleanupImageUrls(loadedThumbnails.value);
});
```

### 8.4 数据加载策略

```typescript
// 分页加载
const PAGE_SIZE = 100;

async function loadMore() {
  if (isLoading.value || !hasMore.value) return;
  
  const newRecords = await invoke<UploadRecord[]>('get_upload_history', {
    query: {
      limit: PAGE_SIZE,
      offset: records.value.length,
    }
  });
  
  if (newRecords.length < PAGE_SIZE) {
    hasMore.value = false;
  }
  
  records.value.push(...newRecords);
}
```

---

## 9. 测试要点

### 9.1 单元测试

```typescript
// tests/utils/dateUtils.test.ts
import { describe, it, expect } from 'vitest';
import { formatDateLabel, groupByDate } from '@/utils/dateUtils';

describe('formatDateLabel', () => {
  it('should return "今天" for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDateLabel(today)).toBe('今天');
  });

  it('should return "昨天" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString().split('T')[0];
    expect(formatDateLabel(yesterday)).toBe('昨天');
  });

  it('should include year for different year', () => {
    expect(formatDateLabel('2020-05-15')).toContain('2020');
  });
});
```

### 9.2 E2E 测试

```typescript
// tests/e2e/timeline.spec.ts
import { test, expect } from '@playwright/test';

test('timeline scrolling', async ({ page }) => {
  await page.goto('/timeline');
  
  // 等待加载完成
  await page.waitForSelector('.timeline-date-group');
  
  // 滚动测试
  await page.evaluate(() => {
    document.querySelector('.timeline-scroll-container')
      ?.scrollTo({ top: 1000 });
  });
  
  // 验证粘性标题更新
  await expect(page.locator('.sticky-header')).toBeVisible();
});

test('image selection', async ({ page }) => {
  await page.goto('/timeline');
  
  // 点击选择图片
  await page.click('.timeline-image:first-child');
  await expect(page.locator('.timeline-image.selected')).toHaveCount(1);
  
  // Ctrl + 点击多选
  await page.click('.timeline-image:nth-child(2)', { modifiers: ['Control'] });
  await expect(page.locator('.timeline-image.selected')).toHaveCount(2);
});
```

### 9.3 性能测试

```typescript
// 测试大量图片的渲染性能
test('renders 10000 images smoothly', async ({ page }) => {
  // Mock 10000 条数据
  await page.route('**/get_upload_history', (route) => {
    route.fulfill({
      body: JSON.stringify(generateMockRecords(10000)),
    });
  });
  
  await page.goto('/timeline');
  
  // 测试滚动帧率
  const fps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      
      const container = document.querySelector('.timeline-scroll-container');
      container?.scrollTo({ top: 50000, behavior: 'smooth' });
      
      function count() {
        frames++;
        if (performance.now() - start < 2000) {
          requestAnimationFrame(count);
        } else {
          resolve(frames / 2); // FPS
        }
      }
      requestAnimationFrame(count);
    });
  });
  
  expect(fps).toBeGreaterThan(30);
});
```

---

## 附录：CSS 变量参考

```css
:root {
  /* 颜色 */
  --primary-color: #1a73e8;
  --primary-rgb: 26, 115, 232;
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e0e0e0;
  --bg-elevated: #ffffff;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --border-color: #dadce0;
  
  /* 暗色主题 */
  @media (prefers-color-scheme: dark) {
    --bg-primary: #202124;
    --bg-secondary: #303134;
    --bg-tertiary: #3c4043;
    --bg-elevated: #3c4043;
    --text-primary: #e8eaed;
    --text-secondary: #9aa0a6;
    --border-color: #5f6368;
  }
}
```

---

## 联系与反馈

如有问题或建议，欢迎提交 Issue 或 PR。

---

*文档版本: 1.0.0*  
*最后更新: 2026-01-11*
