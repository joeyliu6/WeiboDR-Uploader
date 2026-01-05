<script setup lang="ts">
/**
 * Timeline Sidebar (Immich 风格点状时间轴)
 * 用点表示有图片的时间段，支持拖拽快速导航
 * 支持完整时间轴显示（基于时间段统计数据）
 */
import { ref, computed, onUnmounted, watch } from 'vue';
import type { TimePeriodStats } from '../../../composables/useHistory';

export interface TimeGroup {
  id: string;
  label: string;
  year: number;
  month: number;
  day: number;
  date: Date;
  count: number;
}

/** 月份点数据结构 */
interface MonthDot {
  id: string;
  year: number;
  month: number;
  position: number;
  label: string;
  count: number;
  /** 该月份的数据是否已加载 */
  isLoaded: boolean;
}

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

// 计算总照片数
const totalCount = computed(() => {
  return props.groups.reduce((sum, g) => sum + g.count, 0);
});

// 是否使用布局高度（更精确）
const useLayoutHeight = computed(() => {
  return props.groupHeights && props.totalLayoutHeight && props.totalLayoutHeight > 0;
});

// 已加载的月份集合（用于判断某月份是否已加载）
const loadedMonthsSet = computed(() => {
  const set = new Set<string>();
  for (const group of props.groups) {
    set.add(`${group.year}-${group.month}`);
  }
  return set;
});

// 计算每个月份的点位置
// 优先使用完整时间段统计数据，确保时间轴显示所有月份
const monthDots = computed<MonthDot[]>(() => {
  // 优先使用完整时间段统计（显示所有月份）
  if (props.allTimePeriods && props.allTimePeriods.length > 0) {
    return computeDotsFromFullStats(props.allTimePeriods);
  }

  // 降级：使用已加载的 groups 数据
  return computeDotsFromGroups();
});

/**
 * 从完整时间段统计生成点位置（完整时间轴）
 */
function computeDotsFromFullStats(periods: TimePeriodStats[]): MonthDot[] {
  if (periods.length === 0) return [];

  // 计算总数用于位置计算
  const totalWeight = periods.reduce((sum, p) => sum + p.count, 0);
  if (totalWeight === 0) return [];

  let cumulativeCount = 0;
  const dots: MonthDot[] = [];

  // periods 已按时间降序排列
  for (const period of periods) {
    const monthKey = `${period.year}-${period.month}`;
    dots.push({
      id: monthKey,
      year: period.year,
      month: period.month,
      position: cumulativeCount / totalWeight,
      label: `${period.year}年${period.month + 1}月`,
      count: period.count,
      isLoaded: loadedMonthsSet.value.has(monthKey),
    });
    cumulativeCount += period.count;
  }

  return dots;
}

/**
 * 从已加载的 groups 数据生成点位置（降级方案）
 */
function computeDotsFromGroups(): MonthDot[] {
  if (props.groups.length === 0) return [];

  // 按月份聚合分组
  const monthsMap = new Map<string, {
    year: number;
    month: number;
    count: number;
    cumulativeHeight: number;
  }>();

  let cumulativeHeight = 0;
  let cumulativeCount = 0;

  // 分组已按日期降序排列
  for (const group of props.groups) {
    const monthKey = `${group.year}-${group.month}`;
    const height = props.groupHeights?.get(group.id) || 0;

    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, {
        year: group.year,
        month: group.month,
        count: 0,
        cumulativeHeight: useLayoutHeight.value ? cumulativeHeight : cumulativeCount,
      });
    }

    const monthData = monthsMap.get(monthKey)!;
    monthData.count += group.count;

    cumulativeHeight += height;
    cumulativeCount += group.count;
  }

  // 计算总权重
  const totalWeight = useLayoutHeight.value ? props.totalLayoutHeight! : totalCount.value;
  if (totalWeight === 0) return [];

  // 生成点位置
  const dots: MonthDot[] = [];

  for (const [key, data] of monthsMap) {
    dots.push({
      id: key,
      year: data.year,
      month: data.month,
      position: data.cumulativeHeight / totalWeight,
      label: `${data.year}年${data.month + 1}月`,
      count: data.count,
      isLoaded: true, // groups 中的数据都是已加载的
    });
  }

  return dots;
}

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

// 标签位置（跟随指示器）
const labelPosition = computed(() => {
  return hoverProgress.value ?? props.scrollProgress;
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
function findClosestDot(progress: number): MonthDot | null {
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

onUnmounted(() => {
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
</style>
