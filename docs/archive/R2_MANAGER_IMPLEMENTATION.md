# R2 管理视图实现文档

## 概述
本文档描述了 WeiboDR-Uploader v2.0 中新增的 R2 存储管理功能的实现细节。

## 功能特性

### 1. 用户界面 (UI/UX)
- **新增导航按钮**: 在主侧边栏添加了 `🗂️` 图标按钮（ID: `nav-r2-manager`）
- **响应式网格布局**: 使用 CSS Grid 实现类似 Google Photos 的图片网格视图
  - 桌面端：200px 最小列宽
  - 大屏幕（1600px+）：250px 最小列宽
  - 移动端（768px 以下）：150px 最小列宽
- **悬停效果**: 鼠标悬停时显示文件名和删除按钮
- **Lightbox 模态框**: 点击图片查看大图，支持：
  - 复制 R2 公开访问链接
  - 删除图片（带确认对话框）
  - ESC 键关闭
  - 点击背景关闭

### 2. 工具栏功能
- **存储桶信息**: 显示当前 R2 存储桶名称
- **统计信息**: 显示总项目数和总大小
- **刷新按钮**: 手动重新加载对象列表

### 3. Rust 后端命令

#### 3.1 `list_r2_objects`
```rust
#[tauri::command]
async fn list_r2_objects(config: R2Config) -> Result<Vec<R2Object>, String>
```

**功能**:
- 列出 R2 存储桶中的所有对象
- 支持自动分页，处理大量对象
- 按最后修改时间降序排序（最新的在前）
- 返回对象的 key、size 和 lastModified 信息

**依赖**:
- `aws-sdk-s3 = "1.15"`
- `aws-config = "1.1"`

**错误处理**:
- 检查 R2 配置完整性
- 提供友好的中文错误消息

#### 3.2 `delete_r2_object`
```rust
#[tauri::command]
async fn delete_r2_object(config: R2Config, key: String) -> Result<String, String>
```

**功能**:
- 删除 R2 存储桶中的指定对象
- 验证配置和 key 参数
- 返回操作结果消息

**安全性**:
- 前端需要用户确认才能调用
- 支持事务性删除（S3 原子操作）

### 4. 前端逻辑 (`r2-manager.ts`)

#### 4.1 R2Manager 类
```typescript
export class R2Manager {
  constructor(config: UserConfig)
  public async loadObjects(): Promise<void>
  public updateConfig(config: UserConfig): void
  private async deleteObject(obj: R2Object): Promise<void>
  private async copyCurrentObjectLink(): Promise<void>
}
```

**主要方法**:
- `loadObjects()`: 调用 Rust 命令获取对象列表并渲染网格
- `updateConfig()`: 更新配置（用于设置更改后刷新）
- `deleteObject()`: 删除对象，带确认对话框
- `copyCurrentObjectLink()`: 复制 R2 公开访问链接到剪贴板

**状态管理**:
- 显示加载动画（旋转 spinner）
- 错误消息显示（红色背景）
- Toast 通知（成功/失败）

### 5. CSS 样式特性

#### 5.1 网格布局
```css
.r2-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}
```

#### 5.2 图片项动画
- 悬停时上浮效果（`transform: translateY(-4px)`）
- 阴影增强（`box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5)`）
- 覆盖层淡入淡出

#### 5.3 模态框
- 全屏覆盖，背景模糊（`backdrop-filter: blur(4px)`）
- 图片最大高度 70vh，保持比例
- 圆角卡片设计，现代化 UI

#### 5.4 Toast 通知
- 固定在右下角
- 自动淡入淡出
- 3 秒后自动消失
- 成功：绿色 / 失败：红色

### 6. 导航集成

#### 6.1 main.ts 修改
- 导入 `R2Manager` 类
- 添加 `r2ManagerView` 和 `navR2ManagerBtn` DOM 引用
- 更新 `navigateTo()` 函数类型签名，支持 `'r2-manager'`
- 在导航时初始化或刷新 R2Manager 实例

#### 6.2 导航逻辑
```typescript
if (viewId === 'r2-manager') {
  if (!r2Manager) {
    // 首次初始化
    r2Manager = new R2Manager(currentConfig);
    r2Manager.loadObjects();
  } else {
    // 刷新配置并重新加载
    r2Manager.updateConfig(currentConfig);
    r2Manager.loadObjects();
  }
}
```

## 配置要求

用户必须在"设置"中配置以下 R2 参数才能使用此功能：
1. **R2 账户 ID** (Account ID)
2. **R2 访问密钥 ID** (Access Key ID)
3. **R2 访问密钥** (Secret Access Key)
4. **R2 存储桶名称** (Bucket Name)
5. **R2 公开访问域名** (Public Domain) - **必填**，用于构建图片 URL

如果配置不完整，视图将显示错误消息：
> "请先在'设置'中完整配置 R2 并提供'公开访问域名'。"

## 文件清单

### 新增文件
- `src/r2-manager.ts` - R2 管理器类
- `R2_MANAGER_IMPLEMENTATION.md` - 本文档

### 修改文件
- `src-tauri/Cargo.toml` - 添加 aws-sdk-s3 依赖
- `src-tauri/src/main.rs` - 添加两个新的 Tauri 命令
- `index.html` - 添加导航按钮和 R2 管理视图
- `src/style.css` - 添加 R2 管理视图样式（约 360 行）
- `src/main.ts` - 集成导航逻辑

## 使用流程

1. 用户点击侧边栏的 🗂️ 图标
2. 应用检查 R2 配置是否完整
3. 如果配置完整，调用 `list_r2_objects` 获取对象列表
4. 渲染图片网格，每个图片使用 `config.r2.publicDomain + key` 作为 URL
5. 用户可以：
   - 悬停查看文件名和删除按钮
   - 点击图片打开 Lightbox 预览
   - 在 Lightbox 中复制链接或删除
   - 点击网格项的删除按钮直接删除（带确认）
   - 点击刷新按钮重新加载列表

## 错误处理

### 前端
- 配置不完整：显示错误消息，不调用 Rust 命令
- 加载失败：显示错误消息，记录控制台日志
- 删除失败：Toast 通知，保留原对象

### 后端
- 配置验证：返回中文错误消息
- 网络错误：捕获并转换为用户友好的错误消息
- S3 API 错误：使用 SDK 的错误信息

## 性能优化

1. **分页处理**: `list_r2_objects` 自动处理 S3 分页，避免内存溢出
2. **懒加载**: 仅在导航到 R2 管理视图时加载数据
3. **配置缓存**: R2Manager 实例在整个会话中保持，避免重复初始化
4. **CSS Grid**: 使用浏览器原生网格布局，性能优异

## 安全考虑

1. **确认对话框**: 删除操作需要用户明确确认
2. **不可撤销提示**: 确认对话框中明确提示"此操作不可撤销"
3. **配置验证**: Rust 命令在执行前验证所有必填字段
4. **错误日志**: 所有操作记录控制台日志，便于调试

## 未来扩展

可能的功能扩展方向：
1. 批量删除
2. 图片上传到 R2（不通过微博）
3. 文件夹视图（如果 R2 使用路径前缀）
4. 搜索和过滤
5. 排序选项（按大小、名称、日期）
6. 图片元数据显示（EXIF 信息）

## 测试建议

1. **空存储桶测试**: 验证空状态消息显示
2. **大量对象测试**: 测试分页是否正常工作（1000+ 对象）
3. **网络错误测试**: 断网情况下的错误提示
4. **配置缺失测试**: 未配置 R2 时的错误提示
5. **删除操作测试**: 确认对话框和删除后的 UI 更新
6. **响应式测试**: 不同屏幕尺寸下的布局

## 依赖版本

- **aws-sdk-s3**: 1.15
- **aws-config**: 1.1
- **TypeScript**: 项目现有版本
- **Tauri**: 1.5（项目现有版本）

## 许可证

遵循项目主许可证。

