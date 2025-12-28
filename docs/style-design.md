# PicNexus 样式设计规范

本文档定义了 PicNexus 项目的样式架构和开发规范，确保样式代码的一致性、可维护性和主题适配能力。

## 目录

- [核心设计原则](#核心设计原则)
- [文件结构](#文件结构)
- [CSS 变量体系](#css-变量体系)
- [主题适配规范](#主题适配规范)
- [PrimeVue 组件样式](#primevue-组件样式)
- [常见模式](#常见模式)
- [最佳实践](#最佳实践)

---

## 核心设计原则

### 1. 变量优先，避免硬编码

**所有颜色值必须使用 CSS 变量**，禁止在组件中硬编码颜色。

```css
/* ✅ 正确 */
.card {
  background-color: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-subtle);
}

/* ❌ 错误 */
.card {
  background-color: #1e293b;
  color: #f8fafc;
  border: 1px solid #334155;
}
```

### 2. 单一职责，分层管理

样式按职责分层，每个文件只负责特定功能：

| 层级 | 文件 | 职责 |
|------|------|------|
| 变量层 | `dark-theme.css`, `light-theme.css` | 定义主题变量，不包含选择器样式 |
| 组件层 | `primevue-overrides.css` | PrimeVue 组件的主题覆盖 |
| 全局层 | `style.css` | 全局基础样式、布局、通用组件 |
| 动画层 | `transitions.css` | 主题切换过渡动画 |

### 3. 一处定义，多处复用

相同的样式模式只在一个地方定义，通过 CSS 变量实现主题适配，避免在多个文件中重复。

---

## 文件结构

```
src/
├── style.css                    # 全局基础样式
└── theme/
    ├── index.ts                 # PrimeVue 预设配置
    ├── ThemeManager.ts          # 主题切换逻辑
    ├── dark-theme.css           # 深色主题变量
    ├── light-theme.css          # 浅色主题变量
    ├── primevue-overrides.css   # PrimeVue 组件覆盖
    └── transitions.css          # 主题过渡动画
```

### 导入顺序（main.ts）

样式文件的导入顺序非常重要，确保正确的层叠优先级：

```typescript
// 1. 第三方样式
import 'primeicons/primeicons.css';

// 2. 主题变量（先加载，供后续样式使用）
import './theme/dark-theme.css';
import './theme/light-theme.css';

// 3. PrimeVue 组件覆盖（依赖主题变量）
import './theme/primevue-overrides.css';

// 4. 过渡动画
import './theme/transitions.css';
```

> **注意**：`style.css` 在 `index.html` 中通过 `<link>` 引入，在 main.ts 之前加载。

---

## CSS 变量体系

### 变量命名规范

采用 `--{category}-{element}-{state}` 的命名模式：

```css
/* 背景色 */
--bg-app          /* 应用主背景 */
--bg-card         /* 卡片背景 */
--bg-input        /* 输入框背景 */
--bg-disabled     /* 禁用状态背景 */

/* 文本色 */
--text-main       /* 主文本 */
--text-muted      /* 次要文本 */
--text-disabled   /* 禁用文本 */

/* 边框色 */
--border-subtle   /* 普通边框 */
--border-focus    /* 焦点边框 */

/* 状态色 */
--primary         /* 主品牌色 */
--success         /* 成功 */
--warning         /* 警告 */
--error           /* 错误 */

/* 状态背景（带透明度） */
--state-info-bg
--state-success-bg
--state-warn-bg
--state-error-bg

/* 状态文字 */
--state-info-text
--state-success-text
--state-warn-text
--state-error-text

/* 交互状态 */
--hover-overlay         /* 悬浮叠加 */
--hover-overlay-subtle  /* 微妙悬浮 */
--focus-ring-shadow     /* 焦点环 */
--selected-bg           /* 选中背景 */

/* 滚动条 */
--scrollbar-thumb
--scrollbar-thumb-hover
--scrollbar-track
```

### 变量定义位置

| 变量类型 | 定义位置 | 说明 |
|---------|---------|------|
| 主题相关变量 | `dark-theme.css` / `light-theme.css` | 颜色、阴影等随主题变化的值 |
| 尺寸、间距 | `style.css` 的 `:root` | 不随主题变化的布局值 |

---

## 主题适配规范

### 深色主题（默认）

```css
:root,
:root.dark-theme {
  --bg-app: #0f172a;
  --text-main: #f8fafc;
  /* ... */
}
```

### 浅色主题

```css
:root.light-theme {
  --bg-app: #f1f5f9;
  --text-main: #0f172a;
  /* ... */
}
```

### 主题特定样式

当某些样式无法仅通过变量实现时，使用主题类选择器：

```css
/* 只有在确实需要时才使用主题选择器 */
:root.dark-theme .special-element {
  /* 深色主题特殊处理 */
}

:root.light-theme .special-element {
  /* 浅色主题特殊处理 */
}
```

---

## PrimeVue 组件样式

### 覆盖原则

1. **使用 CSS 变量**：所有覆盖样式使用 CSS 变量，自动适配主题
2. **集中管理**：所有 PrimeVue 组件覆盖放在 `primevue-overrides.css`
3. **不使用主题选择器**：组件覆盖样式不需要 `:root.dark-theme` 或 `:root.light-theme` 前缀

### 示例

```css
/* primevue-overrides.css */

/* InputText 组件 - 使用变量，自动适配两种主题 */
.p-inputtext {
  color: var(--text-main);
  background-color: var(--bg-input);
  border-color: var(--border-subtle);
}

.p-inputtext:enabled:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring-shadow);
}

.p-inputtext:disabled {
  color: var(--text-disabled);
  background-color: var(--bg-disabled);
}
```

### 状态颜色

消息和通知组件使用语义化的状态变量：

```css
.p-message.p-message-success {
  background-color: var(--state-success-bg);
  border-color: var(--success);
  color: var(--state-success-text);
}
```

---

## 常见模式

### 滚动条

全局滚动条样式在 `style.css` 中定义，使用 CSS 变量：

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track, transparent);
}

::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--scrollbar-thumb-hover);
}
```

组件如需透明 track，只需覆盖 track 样式：

```css
.my-component::-webkit-scrollbar-track {
  background: transparent;
}
```

### 焦点环

使用统一的焦点环变量：

```css
.focusable-element:focus {
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring-shadow);
}
```

### 悬浮效果

```css
.hoverable:hover {
  background-color: var(--hover-overlay);
}

/* 微妙悬浮（用于列表项等） */
.subtle-hover:hover {
  background-color: var(--hover-overlay-subtle);
}
```

---

## 最佳实践

### ✅ 应该做

1. **新增颜色时先检查变量**：查看是否已有合适的变量可用
2. **新增组件样式时使用变量**：确保主题适配
3. **PrimeVue 覆盖集中管理**：添加到 `primevue-overrides.css`
4. **测试两种主题**：修改样式后同时测试深色和浅色主题

### ❌ 不应该做

1. **不要硬编码颜色值**：使用变量代替
2. **不要在组件中重复全局样式**：如滚动条、焦点环
3. **不要在主题文件中写选择器样式**：主题文件只定义变量
4. **不要使用 `!important`**：除非绝对必要

### 添加新变量的流程

1. 确认现有变量无法满足需求
2. 在 `dark-theme.css` 和 `light-theme.css` 中同时添加变量
3. 使用语义化命名（如 `--state-info-bg` 而非 `--blue-bg-015`）
4. 在需要的地方使用新变量
5. 测试两种主题下的效果

---

## 维护记录

| 日期 | 变更内容 |
|------|---------|
| 2025-12-28 | 初始版本：创建样式设计规范，重构主题系统 |
