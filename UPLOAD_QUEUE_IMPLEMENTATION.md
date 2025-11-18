# 上传队列功能实现文档 v2.0

## 实现概览

本次更新将"上传"视图重构为"实时上传队列管理器"，提供可视化的、可并发处理的上传队列，精细到每个文件的进度和结果反馈。

## 已实现的功能

### 1. 文件类型验证 (PRD 1.2)

**位置**: `src/main.ts`

**功能**:
- 在文件添加到队列前进行类型验证
- 支持的格式: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`
- 不符合格式的文件会弹出阻塞性提示并自动跳过
- 提示信息: "文件类型不支持：${fileName} 不是一个有效的图片格式，已自动跳过。"

**实现函数**:
- `validateFileType(filePath: string): boolean` - 验证单个文件类型
- `filterValidFiles(filePaths: string[]): Promise<{valid, invalid}>` - 批量过滤和验证

### 2. UI 重构 (PRD 1.3)

**文件**: `index.html`, `src/style.css`

**变更**:
- 移除原有全屏拖拽框
- 新增顶部较小的拖拽区域，支持点击选择文件
- 新增 R2 开关复选框（默认勾选）
- 新增上传队列列表容器 `#upload-queue-list`

**R2 开关**:
```html
<input type="checkbox" id="upload-view-toggle-r2" checked />
<label for="upload-view-toggle-r2">同时备份到 Cloudflare R2</label>
```

### 3. 队列行项目设计 (PRD 1.3)

**位置**: `src/uploadQueue.ts`

**组件结构**:
每个队列行包含4列（使用 CSS Grid 布局）:

1. **预览图列** (`div.preview`)
   - 上传前: 显示⏳加载图标
   - 上传成功: 显示百度代理的微博缩略图 (bmiddle尺寸)
   - 上传失败: 显示⚠️错误图标

2. **文件名列** (`div.filename`)
   - 显示完整文件名，支持 tooltip

3. **进度列** (`div.progress-section`)
   - 微博进度条 + 状态文本
   - R2进度条 + 状态文本
   - 状态: "等待中..."、"X%"、"✓ 完成"、"✗ 失败"、"已跳过"

4. **操作列** (`div.actions`)
   - 📸 微博按钮 - 复制 bmiddle 微博链接
   - 🔗 百度按钮 - 复制百度代理链接
   - ☁️ R2按钮 - 复制 R2 公开链接（如果启用了R2）
   - 上传完成前按钮禁用，完成后可点击复制

### 4. 核心逻辑重构 (PRD 1.4)

**新增文件**: `src/uploadQueue.ts`

**UploadQueueManager 类**:
- `addFile(filePath, fileName, uploadToR2): string` - 添加文件到队列
- `createProgressCallback(itemId): UploadProgressCallback` - 创建进度回调
- `updateItem(item)` - 更新队列项UI
- `clearQueue()` - 清空队列

**进度回调类型**:
```typescript
type UploadProgressCallback = (progress: {
  type: 'weibo_progress' | 'r2_progress' | 'weibo_success' | 'r2_success' | 'error' | 'complete';
  payload: any;
}) => void;
```

**新增函数 (src/coreLogic.ts)**:
```typescript
export async function processUpload(
  filePath: string,
  config: UserConfig,
  options: { uploadToR2: boolean },
  onProgress: UploadProgressCallback
): Promise<{ status: 'success' | 'error'; link?: string; message?: string }>
```

**实现细节**:
- 步骤1: 上传到微博（带进度报告）
- 步骤2: 上传到R2（可选，根据开关状态）
- 步骤3: 生成最终链接
- 步骤4: 保存历史记录
- 步骤5: 自动同步到 WebDAV

### 5. 并发上传处理 (PRD 1.4.1)

**位置**: `src/main.ts`

**实现函数**:
```typescript
async function processUploadQueue(
  filePaths: string[],
  config: UserConfig,
  uploadToR2: boolean,
  maxConcurrent: number = 3
): Promise<void>
```

**并发控制**:
- 默认最多同时上传3个文件
- 使用 `Promise.race()` 和 `Promise.all()` 实现并发限制
- 每个文件独立的进度回调，互不干扰

### 6. R2 同时备份功能 (PRD 3.2 / 功能二)

**集成点**:
- UI: R2 开关复选框（`upload-view-toggle-r2`）
- 逻辑: `processUpload` 函数中的 `options.uploadToR2` 参数
- 进度: 独立的 R2 进度条和状态显示

**行为**:
- 勾选时: 微博上传成功后自动上传到 R2
- 未勾选时: R2 状态显示"已跳过"
- R2 失败不影响微博上传（非阻塞性错误）

## 技术亮点

### 1. 类型安全
- 使用 TypeScript 严格类型定义
- 完整的错误处理和边界检查

### 2. 用户体验
- 实时进度反馈
- 颜色区分状态（成功绿色、失败红色、进行中橙色）
- 一键复制多种链接格式
- 非阻塞性错误提示

### 3. 性能优化
- 并发上传提高效率
- 进度条平滑过渡动画
- CSS Grid 布局高效渲染

### 4. 可扩展性
- 队列管理器独立封装
- 进度回调设计灵活
- 易于添加新的上传目标

## 文件变更清单

### 新增文件
- `src/uploadQueue.ts` - 上传队列管理器

### 修改文件
- `index.html` - 上传视图 UI 重构
- `src/style.css` - 新增队列样式
- `src/main.ts` - 上传逻辑重构、文件验证、并发处理
- `src/coreLogic.ts` - 新增 `processUpload` 函数支持进度报告

## 使用示例

### 拖拽上传
1. 拖拽图片到顶部区域
2. 自动验证文件类型
3. 有效文件添加到队列并开始上传
4. 实时查看每个文件的上传进度
5. 上传完成后点击按钮复制链接

### 点击上传
1. 点击顶部拖拽区域
2. 在文件对话框中选择图片
3. 后续流程同拖拽上传

### R2 备份
1. 勾选/取消勾选"同时备份到 Cloudflare R2"
2. 拖拽或选择文件
3. 查看独立的 R2 上传进度

## 兼容性说明

- 保留原有的 `handleFileUpload` 函数，确保向后兼容
- 新的队列管理器不影响历史记录和失败队列功能
- 配置管理和 WebDAV 同步功能正常工作

## 测试建议

### 功能测试
1. 单个文件上传
2. 多个文件并发上传（3+）
3. 混合有效和无效文件类型
4. R2 开关启用/禁用
5. 复制各种链接格式

### 边界测试
1. 空文件列表
2. 非常大的文件（>20MB）
3. Cookie 过期场景
4. 网络断开场景
5. R2 配置错误场景

### 性能测试
1. 10+ 文件同时上传
2. 快速连续拖拽多批文件
3. 长时间运行稳定性

## 已知限制

1. **进度精确度**: 微博上传进度目前是模拟的（10% -> 100%），因为 `uploadToWeibo` 函数暂不支持真实的上传进度回调。可以在未来通过修改 Tauri 的 HTTP 客户端来获取真实的上传进度。

2. **文件预览**: 预览图只在微博上传成功后显示，上传前无法预览本地图片。

3. **并发限制**: 目前硬编码为最多3个并发，未来可以作为用户配置项。

## 未来改进方向

1. 添加真实的上传进度支持（修改 `uploadToWeibo`）
2. 支持队列项目删除/取消功能
3. 支持队列暂停/恢复
4. 添加队列历史（显示已完成的上传）
5. 支持拖拽排序队列优先级
6. 添加批量操作（全部复制、全部清除等）
7. 支持自定义并发数量

## 版本信息

- **版本**: v2.0
- **实现日期**: 2025-11-18
- **基于 PRD**: 功能一（重构"上传"视图为"实时上传队列"）

