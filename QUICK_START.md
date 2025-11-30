# 快速开始指南

## 🚀 立即使用新架构

### 1. 构建项目

```bash
# 安装依赖
npm install

# 构建 Rust 后端（首次需要下载 AWS SDK 依赖）
cd src-tauri
cargo build
cd ..

# 开发模式运行
npm run tauri dev
```

**首次构建可能需要 5-10 分钟**（下载 AWS SDK 依赖）

---

### 2. 验证上传器已注册

打开应用后，在浏览器控制台中输入：

```javascript
window.testUploader.showRegisteredUploaders()
```

应该看到输出：
```
=== 已注册的上传器 ===
可用服务: ['weibo', 'r2']
  - weibo: 新浪微博
  - r2: Cloudflare R2
```

---

### 3. 测试微博上传

#### 方法 1: 使用测试工具（推荐）

在控制台中：

```javascript
// 测试微博上传
await window.testUploader.testWeiboUpload('/path/to/image.jpg')

// 测试完整流程
await window.testUploader.testFullFlow('/path/to/image.jpg', 'weibo')
```

#### 方法 2: 使用应用 UI

1. 打开设置页面
2. 确保已配置微博 Cookie
3. 拖拽图片到上传区域
4. 查看上传进度和结果

---

### 4. 测试 R2 上传

#### 配置 R2

在设置页面配置：
- Account ID
- Access Key ID
- Secret Access Key
- Bucket Name
- Path (如 `images/`)
- Public Domain (如 `https://cdn.example.com`)

#### 测试上传

```javascript
// 测试 R2 上传
await window.testUploader.testR2Upload('/path/to/image.jpg')

// 测试 R2 作为主力
await window.testUploader.testFullFlow('/path/to/image.jpg', 'r2')
```

---

### 5. 测试备份功能

```javascript
// 测试微博 + R2 备份
await window.testUploader.testWeiboWithR2Backup('/path/to/image.jpg')
```

这会：
1. 上传到微博（主力）
2. 异步备份到 R2
3. 5 秒后显示备份结果

---

## 🔧 常见问题

### Q: 编译错误 "cannot find type `Client`"

**A:** 需要先构建 Rust 项目下载依赖：

```bash
cd src-tauri
cargo build
```

### Q: R2 上传失败 "NoSuchBucket"

**A:** 检查：
1. Bucket Name 是否正确
2. Account ID 是否正确
3. 访问密钥是否有权限

### Q: 微博上传失败 "Cookie 已过期"

**A:**
1. 打开设置页面
2. 点击"登录微博"按钮
3. 重新获取 Cookie

### Q: 进度不准确

**A:** 目前 R2 上传的进度是估算的（0% → 50% → 100%），因为 AWS SDK 的进度回调实现较复杂。完整的进度监听需要自定义 ByteStream wrapper。

---

## 📊 架构使用示例

### 直接使用上传器

```typescript
import { WeiboUploader } from './uploaders/weibo';
import { R2Uploader } from './uploaders/r2';

// 微博上传
const weiboUploader = new WeiboUploader();
const result = await weiboUploader.upload(
  '/path/to/image.jpg',
  { config: { enabled: true, cookie: '...' } },
  (percent) => console.log(`进度: ${percent}%`)
);

console.log('上传成功:', result.url);
```

### 使用上传调度器（推荐）

```typescript
import { UploadOrchestrator } from './core';

const orchestrator = new UploadOrchestrator();

const config = {
  primaryService: 'weibo',
  services: {
    weibo: { enabled: true, cookie: '...' },
    r2: { enabled: true, ... }
  },
  backup: {
    enabled: true,
    services: ['r2']
  }
};

const historyItem = await orchestrator.uploadFile(
  '/path/to/image.jpg',
  config
);

// 自动处理：
// ✓ 配置验证
// ✓ 主力上传（微博）
// ✓ 链接生成（可能加百度前缀）
// ✓ 备份上传（R2，异步）
// ✓ 保存历史记录
// ✓ 复制到剪贴板
// ✓ 系统通知
```

---

## 🎯 下一步

### 完善功能
- [ ] 更新设置 UI（主力图床选择器）
- [ ] 更新历史记录 UI（服务标识）
- [ ] 优化 R2 进度监听

### 添加新图床
- [ ] 纳米图床
- [ ] 京东图床
- [ ] TCL 图床

参考：[REFACTORING_GUIDE.md](REFACTORING_GUIDE.md) - "添加新图床"章节

---

## 📚 相关文档

- **[REFACTORING_GUIDE.md](REFACTORING_GUIDE.md)** - 完整迁移指南
- **[ARCHITECTURE_README.md](ARCHITECTURE_README.md)** - 架构说明
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - 实施摘要
- **[integration-example.ts](src/integration-example.ts)** - 集成示例
- **[test-uploader.ts](src/test-uploader.ts)** - 测试工具

---

## ✅ 检查清单

在开始使用前，确保：

- [x] ✅ 已运行 `cargo build`（下载 AWS SDK 依赖）
- [x] ✅ 已运行 `npm install`
- [x] ✅ 应用启动时控制台显示 "上传器已注册"
- [ ] ⬜ 已配置微博 Cookie（如需使用微博）
- [ ] ⬜ 已配置 R2（如需使用 R2）
- [ ] ⬜ 已测试上传功能

---

## 🎉 开始使用

```bash
npm run tauri dev
```

打开应用后，查看控制台是否显示：

```
[初始化] 开始初始化应用...
[Uploaders] 开始注册上传器...
[UploaderFactory] 已注册上传器: weibo
[UploaderFactory] 已注册上传器: r2
[Uploaders] 已注册的上传器: ['weibo', 'r2']
[初始化] 上传器已注册
```

如果看到这些日志，说明新架构已成功集成！🚀
