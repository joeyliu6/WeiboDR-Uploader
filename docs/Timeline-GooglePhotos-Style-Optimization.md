# PicNexus 时间轴优化开发文档

## Google Photos 风格月份点实现

**文档版本**: 1.0  
**更新日期**: 2026-01-11  
**相关文件**: `src/components/views/timeline/TimelineSidebar.vue`

---

## 1. 需求背景

### 1.1 原有问题

原有的时间轴实现存在以下问题：

1. **月份点过于密集**: 所有月份都显示点，当数据跨越多年时，点会非常密集，难以辨识
2. **点的样式复杂**: 区分「已加载」和「未加载」两种状态，使用不同颜色和样式（实心/空心），视觉上较为杂乱
3. **间距不合理**: 所有月份点的间距基于时间均匀分布，而非基于数据量，导致照片多的月份和照片少的月份视觉权重相同

### 1.2 优化目标

参考 Google Photos 的时间轴设计，实现以下效果：

1. **智能过滤**: 照片数量少的月份不显示点，减少视觉噪音
2. **动态间距**: 照片数量多的月份占据更大空间，点之间间距更大
3. **统一样式**: 所有月份点使用统一大小的灰色圆点，简洁美观

---

## 2. 技术方案

### 2.1 核心算法

#### 2.1.1 显示阈值计算

采用动态阈值策略，根据数据总量和月份数量自动计算：

```typescript
const minDisplayThreshold = Math.max(
  totalWeight * 0.003,  // 至少占总数的 0.3%
  Math.min(5, totalWeight / periods.length * 0.1)  // 或至少有一定数量
);
```

**阈值逻辑说明**:

| 条件 | 计算方式 | 说明 |
|------|----------|------|
| 最小占比 | `totalWeight * 0.003` | 月份照片数至少占总数的 0.3% |
| 最小数量 | `totalWeight / periods.length * 0.1` | 至少达到平均数的 10% |
| 上限保护 | `Math.min(5, ...)` | 最小数量不超过 5 张 |

**示例计算**:

- 总照片数: 33,002 张
- 月份数: 120 个月
- 阈值 1: 33,002 × 0.3% = 99 张
- 阈值 2: min(5, 33,002 / 120 × 0.1) = min(5, 27.5) = 5 张
- 最终阈值: max(99, 5) = 99 张

即：月份照片数少于 99 张的不显示点。

#### 2.1.2 位置计算（动态间距）

点的位置基于**累计照片数量**而非时间计算：

```typescript
let cumulativeCount = 0;

for (const period of periods) {
  const position = cumulativeCount / totalWeight;  // 0 ~ 1 之间的位置
  cumulativeCount += period.count;
}
```

**效果说明**:

- 照片多的月份：`period.count` 大，累加后位置变化大，点间距大
- 照片少的月份：`period.count` 小，累加后位置变化小，点间距小

### 2.2 数据结构变更

#### 2.2.1 MonthDot 接口

新增 `visible` 属性：

```typescript
interface MonthDot {
  id: string;
  year: number;
  month: number;
  position: number;      // 0-1 之间的位置比例
  label: string;         // 显示标签，如 "2024年12月"
  count: number;         // 该月份的照片数量
  isLoaded: boolean;     // 数据是否已加载
  visible: boolean;      // 是否应该显示（新增）
}
```

### 2.3 样式变更

#### 2.3.1 原有样式（已移除）

```css
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
}
```

#### 2.3.2 新样式（Google Photos 风格）

```css
/* 月份点 - 统一大小的灰色圆点 */
.month-dot {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translateY(-50%);
  transition: opacity 0.2s, transform 0.2s;
  background: var(--text-secondary);
  opacity: 0;
  pointer-events: none;
}

/* 可见的月份点 */
.month-dot.visible {
  opacity: 0.4;
  pointer-events: auto;
}

/* 隐藏的月份点 */
.month-dot.hidden {
  opacity: 0;
  pointer-events: none;
}

/* 悬停时高亮 */
.timeline-sidebar:hover .month-dot.visible {
  opacity: 0.6;
}
```

---

## 3. 代码变更详情

### 3.1 文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `src/components/views/timeline/TimelineSidebar.vue` | 修改 | 核心逻辑和样式变更 |

### 3.2 关键代码变更

#### 3.2.1 computeDotsFromFullStats 函数

**变更前**:
```typescript
function computeDotsFromFullStats(periods: TimePeriodStats[]): MonthDot[] {
  // ... 简单地为每个月份生成点
  for (const period of periods) {
    dots.push({
      // ... 不包含 visible 属性
    });
  }
  return dots;
}
```

**变更后**:
```typescript
function computeDotsFromFullStats(periods: TimePeriodStats[]): MonthDot[] {
  if (periods.length === 0) return [];

  const totalWeight = periods.reduce((sum, p) => sum + p.count, 0);
  if (totalWeight === 0) return [];

  // 动态阈值计算
  const minDisplayThreshold = Math.max(
    totalWeight * 0.003,
    Math.min(5, totalWeight / periods.length * 0.1)
  );

  let cumulativeCount = 0;
  const dots: MonthDot[] = [];

  for (const period of periods) {
    const monthKey = `${period.year}-${period.month}`;
    const visible = period.count >= minDisplayThreshold;  // 新增：判断是否显示
    
    dots.push({
      id: monthKey,
      year: period.year,
      month: period.month,
      position: cumulativeCount / totalWeight,
      label: `${period.year}年${period.month + 1}月`,
      count: period.count,
      isLoaded: loadedMonthsSet.value.has(monthKey),
      visible,  // 新增字段
    });
    cumulativeCount += period.count;
  }

  return dots;
}
```

#### 3.2.2 模板变更

**变更前**:
```vue
<div
  v-for="dot in monthDots"
  :key="dot.id"
  class="month-dot"
  :class="{ loaded: dot.isLoaded, unloaded: !dot.isLoaded }"
  :style="{ top: `${dot.position * 100}%` }"
/>
```

**变更后**:
```vue
<div
  v-for="dot in monthDots"
  :key="dot.id"
  class="month-dot"
  :class="{ visible: dot.visible, hidden: !dot.visible }"
  :style="{ top: `${dot.position * 100}%` }"
/>
```

---

## 4. 视觉效果对比

### 4.1 变更前

```
时间轴                     问题
  ●  2025年1月            所有月份都显示
  ○  2024年12月           已加载/未加载样式不同
  ○  2024年11月           点过于密集
  ●  2024年10月           间距均匀，不反映数据量
  ○  2024年9月
  ●  2024年8月
  ...（大量密集的点）
```

### 4.2 变更后

```
时间轴                     效果
  ●  2025年1月            照片多，间距大
  
  
  ●  2024年10月           照片多，间距大
  
  ●  2024年8月            照片中等
  ●  2024年7月            照片多
  
  
  ●  2024年3月            照片少的月份不显示
  ...（稀疏、有意义的点）
```

---

## 5. 配置参数

### 5.1 可调整参数

| 参数 | 当前值 | 说明 | 建议范围 |
|------|--------|------|----------|
| 最小占比阈值 | 0.003 (0.3%) | 月份至少占总数的比例 | 0.001 ~ 0.01 |
| 最小数量上限 | 5 | 最小数量的上限保护 | 3 ~ 10 |
| 平均数系数 | 0.1 (10%) | 至少达到平均数的比例 | 0.05 ~ 0.2 |
| 点大小 | 6px | 月份点直径 | 4px ~ 8px |
| 默认透明度 | 0.4 | 正常状态透明度 | 0.3 ~ 0.5 |
| 悬停透明度 | 0.6 | 悬停状态透明度 | 0.5 ~ 0.8 |

### 5.2 参数调整建议

**数据量较少时（< 1000 张）**:
```typescript
const minDisplayThreshold = Math.max(
  totalWeight * 0.01,   // 提高到 1%
  Math.min(3, ...)      // 降低最小数量
);
```

**数据量较大时（> 100,000 张）**:
```typescript
const minDisplayThreshold = Math.max(
  totalWeight * 0.002,  // 降低到 0.2%
  Math.min(10, ...)     // 提高最小数量
);
```

---

## 6. 兼容性说明

### 6.1 向后兼容

- ✅ 保留了 `isLoaded` 属性，点击未加载月份仍可触发加载
- ✅ 保留了原有的拖拽和跳转功能
- ✅ 保留了响应式布局支持

### 6.2 数据源兼容

支持两种数据源，自动降级：

1. **完整时间段统计** (`allTimePeriods`): 优先使用，显示所有月份
2. **已加载分组数据** (`groups`): 降级方案，仅显示已加载月份

---

## 7. 测试要点

### 7.1 功能测试

| 测试项 | 预期结果 | 状态 |
|--------|----------|------|
| 照片少的月份不显示点 | 低于阈值的月份点不可见 | ⬜ |
| 照片多的月份间距大 | 点之间的距离与数据量成正比 | ⬜ |
| 悬停显示标签 | 悬停时显示正确的月份标签 | ⬜ |
| 拖拽滚动 | 拖拽指示器可正常滚动 | ⬜ |
| 点击跳转 | 点击可跳转到对应月份 | ⬜ |

### 7.2 边界测试

| 测试项 | 测试数据 | 预期结果 |
|--------|----------|----------|
| 空数据 | 0 张照片 | 不显示任何点 |
| 单月数据 | 只有 1 个月 | 显示 1 个点在顶部 |
| 均匀分布 | 每月数量相同 | 点均匀分布 |
| 极端分布 | 99% 数据在 1 个月 | 该月份占据大部分空间 |

### 7.3 性能测试

| 测试项 | 数据量 | 预期性能 |
|--------|--------|----------|
| 小数据量 | 100 张 | < 1ms |
| 中等数据量 | 10,000 张 | < 5ms |
| 大数据量 | 100,000 张 | < 20ms |

---

## 8. 后续优化建议

### 8.1 短期优化

1. **阈值可配置化**: 将阈值参数提取到配置文件，支持用户自定义
2. **年份标记**: 在时间轴上添加年份分隔线或标记
3. **数量指示**: 悬停时显示该月份的具体照片数量

### 8.2 长期优化

1. **自适应阈值**: 根据时间轴高度动态调整显示的点数量
2. **聚合显示**: 当月份过多时，自动聚合为季度或年度
3. **动画过渡**: 数据加载时添加点的出现动画

---

## 9. 参考资料

- [Google Photos 时间轴设计](https://photos.google.com/)
- [Immich 时间轴实现](https://github.com/immich-app/immich)
- [PicNexus 原有时间轴文档](./PicNexus-Timeline-Feature-Dev-Doc.md)

---

## 10. 变更日志

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| 1.0 | 2026-01-11 | - | 初始版本，实现 Google Photos 风格时间轴 |
