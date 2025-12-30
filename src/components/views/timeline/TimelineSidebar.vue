<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

export interface TimeGroup {
  id: string; // unique id (e.g., '2024-5-15')
  label: string; // display label (e.g., '5月')
  year: number;
  month: number;
  day: number;
  date: Date;
  count: number;
}

const props = defineProps<{
  groups: TimeGroup[];
  scrollProgress: number; // 滚动进度 0-1
  visibleRatio: number; // 可见区域比例 0-1
  currentMonthLabel: string; // 当前滚动位置的月份标签
}>();

const emit = defineEmits<{
  (e: 'drag-scroll', progress: number): void;
}>();

// 侧边栏容器引用
const sidebarRef = ref<HTMLElement | null>(null);

// 鼠标悬停位置（0-1），null 表示鼠标不在区域内
const hoverProgress = ref<number | null>(null);

// 按年分组（用于显示年份标签和月份点）
const years = computed(() => {
  const yearsMap = new Map<number, TimeGroup[]>();
  props.groups.forEach(group => {
    if (!yearsMap.has(group.year)) {
      yearsMap.set(group.year, []);
    }
    yearsMap.get(group.year)?.push(group);
  });

  // Sort years descending
  return Array.from(yearsMap.keys()).sort((a, b) => b - a).map(year => ({
    year,
    groups: yearsMap.get(year)?.sort((a, b) => b.date.getTime() - a.date.getTime()) || []
  }));
});

// 滑块显示的月份
const displayMonth = computed(() => {
  if (props.groups.length === 0) return '';

  // 使用悬停位置或滚动位置
  const progress = hoverProgress.value ?? props.scrollProgress;
  const index = Math.floor(progress * (props.groups.length - 1));
  const group = props.groups[Math.min(index, props.groups.length - 1)];
  return group ? `${group.month + 1}月` : props.currentMonthLabel;
});

// 滑块位置样式
const indicatorStyle = computed(() => {
  if (!sidebarRef.value) return {};
  const trackHeight = sidebarRef.value.clientHeight;
  const padding = 20;
  const availableHeight = trackHeight - padding * 2;

  // 使用悬停位置或滚动位置
  const progress = hoverProgress.value ?? props.scrollProgress;
  const top = padding + availableHeight * progress;

  return {
    top: `${top}px`
  };
});

// 鼠标移动：滑块跟随鼠标
const handleMouseMove = (e: MouseEvent) => {
  if (!sidebarRef.value) return;
  const rect = sidebarRef.value.getBoundingClientRect();
  const padding = 20;
  const y = e.clientY - rect.top - padding;
  const availableHeight = rect.height - padding * 2;
  hoverProgress.value = Math.max(0, Math.min(1, y / availableHeight));
};

// 鼠标离开：滑块回到滚动位置
const handleMouseLeave = () => {
  hoverProgress.value = null;
};

// 点击：跳转到鼠标位置
const handleClick = () => {
  if (hoverProgress.value !== null) {
    emit('drag-scroll', hoverProgress.value);
  }
};

// 拖拽状态（保留拖拽功能）
const isDragging = ref(false);
const dragStartY = ref(0);
const dragStartProgress = ref(0);

const startDrag = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragging.value = true;
  dragStartY.value = e.clientY;
  dragStartProgress.value = hoverProgress.value ?? props.scrollProgress;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !sidebarRef.value) return;
  const trackHeight = sidebarRef.value.clientHeight - 40;
  const deltaY = e.clientY - dragStartY.value;
  const deltaProgress = deltaY / trackHeight;
  const newProgress = Math.max(0, Math.min(1, dragStartProgress.value + deltaProgress));
  hoverProgress.value = newProgress;
  emit('drag-scroll', newProgress);
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
});

</script>

<template>
  <div
    class="timeline-sidebar"
    ref="sidebarRef"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- 位置指示器：标签 + 指示线 -->
    <div
      class="position-indicator"
      :class="{ dragging: isDragging, hovering: hoverProgress !== null }"
      :style="indicatorStyle"
      @mousedown="startDrag"
    >
      <div class="indicator-label">
        <span>{{ displayMonth }}</span>
      </div>
      <div class="indicator-line"></div>
    </div>

    <!-- 时间轴轨道（仅视觉，无交互） -->
    <div class="timeline-track">
      <div
        v-for="yearData in years"
        :key="yearData.year"
        class="year-segment"
      >
        <!-- Year Label -->
        <div class="year-label">{{ yearData.year }}</div>

        <!-- Day dots (视觉展示，无交互) -->
        <div class="days-container">
          <div
            v-for="group in yearData.groups"
            :key="group.id"
            class="day-dot"
          ></div>
        </div>
      </div>
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
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  overflow: visible; /* 允许指示器溢出 */
  user-select: none;
  cursor: pointer;
}

.timeline-track {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  align-items: center;
  pointer-events: none;
}

.year-segment {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.year-label {
  font-size: 10px;
  font-weight: bold;
  color: var(--text-secondary);
  opacity: 0.8;
}

.days-container {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  align-items: center;
}

.day-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--text-muted);
  opacity: 0.4;
}

/* 位置指示器 - 参考 immich */
.position-indicator {
  position: absolute;
  right: 48px; /* 在时间轴点的左侧 */
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 0;
  cursor: grab;
  z-index: 10;
  pointer-events: auto;
}

.position-indicator:hover,
.position-indicator.hovering {
  cursor: pointer;
}

.position-indicator.dragging {
  cursor: grabbing;
}

/* 月份标签 */
.indicator-label {
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);
  border-radius: 4px 0 0 4px;
  border-bottom: 2px solid var(--primary);
  white-space: nowrap;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.25);
}

.indicator-label span {
  color: white;
  font-size: 12px;
  font-weight: 600;
}

/* 指示线 */
.indicator-line {
  width: 12px;
  height: 2px;
  background: var(--primary);
}
</style>
