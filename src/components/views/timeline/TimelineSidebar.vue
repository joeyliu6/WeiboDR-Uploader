<script setup lang="ts">
/**
 * Timeline Sidebar (Immich 风格点状时间轴)
 * 用点表示有图片的时间段，支持拖拽快速导航
 *
 * 智能过滤策略（参考 Google 相册）：
 * 1. 层级降级：根据时间跨度自动调整显示粒度
 * 2. 最小间距过滤：贪心选点，保证点不重叠
 * 3. 优先级选点：重要时间点优先显示
 * 4. 低密度过滤：数量过少的月份点隐藏
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { TimePeriodStats } from '../../../composables/useHistory';
import { filterMonthPoints, type FilteredPoint } from '../../../utils/timelineFilter';

export interface TimeGroup {
  id: string;
  label: string;
  year: number;
  month: number;
  day: number;
  date: Date;
  count: number;
}

// MonthDot 类型现在使用 FilteredPoint（来自 timelineFilter.ts）

const props = defineProps<{
  groups: TimeGroup[];
  scrollProgress: number;
  visibleRatio: number;
  currentMonthLabel: string;
  /** 每个分组的实际布局高度 */
  groupHeights?: Map<string, number>;
  /** 总布局高度 */
  totalLayoutHeight?: number;
  /** 完整的时间段统计（用于显示所有月份） */
  allTimePeriods?: TimePeriodStats[];
}>();

const emit = defineEmits<{
  (e: 'drag-scroll', progress: number): void;
  (e: 'jump-to-period', year: number, month: number): void;
}>();

// 侧边栏容器引用
const sidebarRef = ref<HTMLElement | null>(null);

// 容器高度（用于智能过滤计算）
const containerHeight = ref(0);

// ResizeObserver 实例
let resizeObserver: ResizeObserver | null = null;

// 鼠标悬停位置（0-1），null 表示不在区域内
const hoverProgress = ref<number | null>(null);

// 是否显示标签（悬停或拖拽时显示）
const showLabel = ref(false);

// 页面滚动时，重置悬停状态
watch(() => props.scrollProgress, () => {
  if (!isDragging.value) {
    hoverProgress.value = null;
  }
});

// 已加载的月份集合（用于判断某月份是否已加载）
const loadedMonthsSet = computed(() => {
  const set = new Set<string>();
  for (const group of props.groups) {
    set.add(`${group.year}-${group.month}`);
  }
  return set;
});

/**
 * 计算月份点（使用智能过滤算法）
 *
 * 处理流程：
 * 1. 低密度过滤 → 去掉照片数 < 平均值 10% 的月份
 * 2. 层级降级 → 根据时间跨度决定粒度
 * 3. 最小间距过滤 → 贪心算法，保证点间距足够
 * 4. 边界保护 → 确保第一个和最后一个月份始终显示
 */
const monthDots = computed<FilteredPoint[]>(() => {
  // 必须有完整的时间段统计数据和有效的容器高度
  if (!props.allTimePeriods?.length || containerHeight.value <= 0) {
    return [];
  }

  return filterMonthPoints(
    props.allTimePeriods,
    loadedMonthsSet.value,
    containerHeight.value
  );
});

// 当前显示的月份标签
const currentLabel = computed(() => {
  if (props.groups.length === 0 || monthDots.value.length === 0) return '';

  const progress = hoverProgress.value ?? props.scrollProgress;

  // 找到最接近的月份
  let closestDot = monthDots.value[0];
  let minDistance = Math.abs(progress - closestDot.position);

  for (const dot of monthDots.value) {
    const distance = Math.abs(progress - dot.position);
    if (distance < minDistance) {
      minDistance = distance;
      closestDot = dot;
    }
  }

  return closestDot.label;
});

// 指示器位置
const indicatorStyle = computed(() => {
  if (!sidebarRef.value) return {};
  const trackHeight = sidebarRef.value.clientHeight;
  const indicatorHeight = 28;
  const availableHeight = trackHeight - indicatorHeight;

  const progress = hoverProgress.value ?? props.scrollProgress;
  const top = (indicatorHeight / 2) + availableHeight * progress;

  return {
    top: `${top}px`,
  };
});


// 鼠标移动
const handleMouseMove = (e: MouseEvent) => {
  if (!sidebarRef.value) return;
  const rect = sidebarRef.value.getBoundingClientRect();
  const indicatorHeight = 28;
  const y = e.clientY - rect.top - (indicatorHeight / 2);
  const availableHeight = rect.height - indicatorHeight;
  hoverProgress.value = Math.max(0, Math.min(1, y / availableHeight));
  showLabel.value = true;
};

// 鼠标进入
const handleMouseEnter = () => {
  showLabel.value = true;
};

// 鼠标离开
const handleMouseLeave = () => {
  if (!isDragging.value) {
    showLabel.value = false;
    hoverProgress.value = null;
  }
};

/**
 * 找到最接近指定进度的月份点
 */
function findClosestDot(progress: number): FilteredPoint | null {
  const dots = monthDots.value;
  if (dots.length === 0) return null;

  let closest = dots[0];
  let minDistance = Math.abs(progress - closest.position);

  for (const dot of dots) {
    const distance = Math.abs(progress - dot.position);
    if (distance < minDistance) {
      minDistance = distance;
      closest = dot;
    }
  }

  return closest;
}

// 点击跳转
const handleClick = () => {
  if (hoverProgress.value === null) return;

  // 找到最接近的月份点
  const closestDot = findClosestDot(hoverProgress.value);

  if (closestDot && !closestDot.isLoaded) {
    // 如果该月份未加载，触发跳转加载事件
    console.log(`[TimelineSidebar] 跳转到未加载月份: ${closestDot.year}年${closestDot.month + 1}月`);
    emit('jump-to-period', closestDot.year, closestDot.month);
  } else {
    // 已加载，直接滚动
    emit('drag-scroll', hoverProgress.value);
  }
};

// 拖拽状态
const isDragging = ref(false);
const dragStartY = ref(0);
const dragStartProgress = ref(0);

const startDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  showLabel.value = true;
  dragStartY.value = e.clientY;
  dragStartProgress.value = hoverProgress.value ?? props.scrollProgress;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !sidebarRef.value) return;
  const indicatorHeight = 28;
  const availableHeight = sidebarRef.value.clientHeight - indicatorHeight;
  const deltaY = e.clientY - dragStartY.value;
  const deltaProgress = deltaY / availableHeight;
  const newProgress = Math.max(0, Math.min(1, dragStartProgress.value + deltaProgress));
  hoverProgress.value = newProgress;
  emit('drag-scroll', newProgress);
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// ==================== 生命周期 ====================

onMounted(() => {
  // 初始化容器高度
  updateContainerHeight();

  // 监听容器大小变化
  if (sidebarRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerHeight();
    });
    resizeObserver.observe(sidebarRef.value);
  }
});

/** 更新容器可用高度 */
function updateContainerHeight() {
  if (sidebarRef.value) {
    // 轨道区域高度 = 容器高度 - 上下 padding (20px * 2)
    const rect = sidebarRef.value.getBoundingClientRect();
    containerHeight.value = rect.height - 40;
  }
}

onUnmounted(() => {
  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});
</script>

<template>
  <div
    class="timeline-sidebar"
    ref="sidebarRef"
    @mouseenter="handleMouseEnter"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- 时间轴轨道 -->
    <div class="timeline-track">
      <!-- 月份点 -->
      <div
        v-for="dot in monthDots"
        :key="dot.id"
        class="month-dot"
        :class="{ loaded: dot.isLoaded, unloaded: !dot.isLoaded }"
        :style="{ top: `${dot.position * 100}%` }"
        :title="`${dot.label} (${dot.count}张${dot.isLoaded ? '' : ' - 点击加载'})`"
      />
    </div>

    <!-- 位置指示器 -->
    <div
      class="position-indicator"
      :class="{ dragging: isDragging, active: showLabel }"
      :style="indicatorStyle"
      @mousedown="startDrag"
    >
      <!-- 指示器圆点 -->
      <div class="indicator-dot"></div>

      <!-- 月份标签（悬停/拖拽时显示） -->
      <Transition name="label-fade">
        <div v-if="showLabel" class="indicator-label">
          <span>{{ currentLabel }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.timeline-sidebar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  user-select: none;
  cursor: pointer;
}

/* 时间轴轨道 */
.timeline-track {
  position: absolute;
  top: 20px;
  bottom: 20px;
  right: 16px;
  width: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 月份点 - 基础样式 */
.month-dot {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translateY(-50%);
  transition: opacity 0.2s, transform 0.2s, background 0.2s;
}

/* 已加载的月份点 - 实心 */
.month-dot.loaded {
  background: var(--primary);
  opacity: 0.5;
}

/* 未加载的月份点 - 空心 */
.month-dot.unloaded {
  background: transparent;
  border: 1.5px solid var(--text-secondary);
  opacity: 0.35;
  box-sizing: border-box;
}

.timeline-sidebar:hover .month-dot.loaded {
  opacity: 0.7;
}

.timeline-sidebar:hover .month-dot.unloaded {
  opacity: 0.5;
  border-color: var(--primary);
}

/* 位置指示器 */
.position-indicator {
  position: absolute;
  right: 8px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  gap: 8px;
  cursor: grab;
  z-index: 10;
  pointer-events: auto;
}

.position-indicator.dragging {
  cursor: grabbing;
}

/* 指示器圆点 */
.indicator-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  transition: transform 0.2s, box-shadow 0.2s;
}

.position-indicator:hover .indicator-dot,
.position-indicator.active .indicator-dot {
  transform: scale(1.2);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
}

.position-indicator.dragging .indicator-dot {
  transform: scale(1.3);
  box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.4);
}

/* 月份标签 */
.indicator-label {
  padding: 6px 12px;
  background: var(--bg-surface);
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

/* 标签过渡动画 */
.label-fade-enter-active,
.label-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.label-fade-enter-from,
.label-fade-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

/* ========== 响应式适配 ========== */

/* 平板设备 (≤1024px) */
@media (max-width: 1024px) {
  .timeline-sidebar {
    width: 40px; /* 缩小侧边栏宽度 */
  }

  .indicator-label {
    display: none; /* 隐藏悬停标签，避免遮挡 */
  }
}

/* 手机设备 (≤768px) */
@media (max-width: 768px) {
  .timeline-sidebar {
    width: 32px;
    padding-right: 6px;
  }

  .timeline-track {
    right: 12px;
  }

  .indicator-dot {
    width: 10px;
    height: 10px;
  }
}

/* 触摸设备优化 */
@media (hover: none) {
  /* 增大月份点的点击区域 */
  .month-dot {
    width: 6px;
    height: 6px;
  }

  .month-dot.unloaded {
    border-width: 2px;
  }

  /* 增大指示器点击区域 */
  .indicator-dot {
    width: 14px;
    height: 14px;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.25);
  }

  .position-indicator {
    cursor: default; /* 触摸设备不显示 grab 光标 */
  }

  /* 触摸设备始终显示标签（代替悬停） */
  .indicator-label {
    display: block;
    opacity: 0.9;
    font-size: 12px;
  }
}
</style>
