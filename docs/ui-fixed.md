# UI 问题修复记录

## 1. 表格视图滚动条不显示问题

**问题描述**：上传历史页面的表格视图无法显示滚动条，内容超出时无法滚动查看。

**问题原因**：
- `.history-container` 设置了 `overflow: hidden`，阻止了滚动
- DataTable 的内部滚动被禁用（`overflow: visible !important`），需要外层容器负责滚动

**解决方案**：

参考 commit `6500bc07bd66e1014cf77114dbcf79831eb135da` 的方案：

```css
/* 外层容器 .history-view */
.history-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;  /* 外层不滚动 */
  background: var(--bg-app);
}

/* 内容容器 .history-container 负责滚动 */
.history-container {
  flex: 1;
  overflow-y: auto;   /* 启用垂直滚动 */
  overflow-x: hidden;
  padding: 20px;
  max-width: 850px;
  margin: 0 auto;
  width: 100%;
}

/* 禁用 DataTable 内部滚动，由外层统一处理 */
:deep(.history-table .p-datatable-table-container) {
  overflow: visible !important;
}
```

**关键点**：
1. `.history-view` 设置 `overflow: hidden`，作为 flex 容器
2. `.history-container` 设置 `flex: 1` 和 `overflow-y: auto`，负责滚动
3. DataTable 的 `.p-datatable-table-container` 设置 `overflow: visible`，禁用内部滚动
4. 网格视图的 `.virtual-waterfall-container` 有自己的 `overflow-y: auto`，自行处理滚动

**修复 commit**：`e4abd10` - fix(history): 修复表格视图滚动条不显示的问题
