# 多图床架构重构 - 迁移指南

## 📋 概述

本指南介绍如何将现有代码迁移到新的多图床架构。新架构支持微博、R2、纳米、京东等多个图床服务。

## ✅ 已完成的工作

### Phase 1-3: 基础架构 ✓
- ✅ 创建目录结构 (`src/uploaders/`, `src/core/`, `src/config/`)
- ✅ 实现核心接口 (`IUploader`, `BaseUploader`, `UploaderFactory`)
- ✅ 实现 `WeiboUploader`（从 `weiboUploader.ts` 重构）
- ✅ 实现 `R2Uploader`（从 `coreLogic.ts` 提取）
- ✅ 新配置类型 (`UserConfig`, `HistoryItem`)

### Phase 4: 核心逻辑 ✓
- ✅ 实现 `LinkGenerator`（处理百度前缀）
- ✅ 实现 `UploadOrchestrator`（替代 `coreLogic.ts`）
- ✅ Rust 命令框架 (`upload_to_r2` 已注册）

### 附加工具 ✓
- ✅ 集成示例 (`integration-example.ts`)
- ✅ 模板上传器 (`TemplateUploader.ts`)
- ✅ 本迁移指南

---

## 🚀 迁移步骤

### 步骤 1: 添加 Rust 依赖

编辑 `src-tauri/Cargo.toml`，在 `[dependencies]` 部分添加：

```toml
[dependencies]
# ... 现有依赖
aws-config = { version = "1.0", features = ["behavior-version-latest"] }
aws-sdk-s3 = "1.0"
aws-smithy-types = "1.0"
```

然后运行：
```bash
cd src-tauri
cargo build
```

### 步骤 2: 完善 R2 Rust 命令

打开 `src-tauri/src/commands/r2.rs`，替换 TODO 部分为实际的 AWS SDK 实现。

参考代码：
```rust
// 构建 S3 客户端
use aws_sdk_s3::{Client, Config, Credentials, Region};
use aws_sdk_s3::primitives::ByteStream;

let credentials = Credentials::new(
    &access_key_id,
    &secret_access_key,
    None,
    None,
    "r2"
);

let endpoint = format!("https://{}.r2.cloudflarestorage.com", account_id);

let config = Config::builder()
    .endpoint_url(&endpoint)
    .credentials_provider(credentials)
    .region(Region::new("auto"))
    .build();

let client = Client::from_conf(config);

// 上传文件
let body = ByteStream::from_path(&path).await?;

let result = client
    .put_object()
    .bucket(&bucket_name)
    .key(&key)
    .body(body)
    .send()
    .await?;

Ok(R2UploadResult {
    e_tag: result.e_tag().map(|s| s.to_string()),
    size: file_size,
})
```

### 步骤 3: 在 main.ts 中初始化上传器

在 `src/main.ts` 的 `DOMContentLoaded` 事件中添加：

```typescript
import { initializeUploaders } from './uploaders';

document.addEventListener('DOMContentLoaded', async () => {
  // 初始化上传器（注册微博、R2等）
  initializeUploaders();

  // ... 其他初始化代码
});
```

### 步骤 4: 替换上传逻辑

#### 原有代码（旧架构）：
```typescript
import { handleFileUpload } from './coreLogic';

async function upload(filePath: string) {
  await handleFileUpload(filePath, config);
}
```

#### 新代码（新架构）：
```typescript
import { UploadOrchestrator } from './core';

const uploadOrchestrator = new UploadOrchestrator();

async function upload(filePath: string) {
  const historyItem = await uploadOrchestrator.uploadFile(
    filePath,
    config,
    (percent) => {
      console.log(`上传进度: ${percent}%`);
    }
  );

  console.log('上传成功', historyItem);
}
```

详细示例请参考 `src/integration-example.ts`。

### 步骤 5: 更新配置读取/保存

#### 新配置结构：

```typescript
import { UserConfig } from './config/types';

const config: UserConfig = {
  primaryService: 'weibo',  // 或 'r2'
  services: {
    weibo: {
      enabled: true,
      cookie: '你的微博Cookie'
    },
    r2: {
      enabled: true,
      accountId: '...',
      accessKeyId: '...',
      secretAccessKey: '...',
      bucketName: '...',
      path: 'images/',
      publicDomain: 'https://cdn.example.com'
    }
  },
  outputFormat: 'baidu-proxy',  // 或 'direct'
  baiduPrefix: 'https://image.baidu.com/search/down?thumburl=',
  backup: {
    enabled: true,
    services: ['r2']  // 备份到 R2
  }
};
```

#### 保存配置：

```typescript
import { Store } from './store';

const configStore = new Store('.settings.dat');
await configStore.set('config', config);
await configStore.save();
```

### 步骤 6: 更新历史记录显示

新的历史记录结构包含更多信息：

```typescript
interface HistoryItem {
  id: string;
  timestamp: number;
  localFileName: string;
  primaryService: ServiceType;    // 'weibo' | 'r2' | ...
  primaryResult: UploadResult;
  backups?: Array<{...}>;
  generatedLink: string;
}
```

渲染历史记录时，可以显示服务标识：

```typescript
function renderHistory(item: HistoryItem) {
  const serviceName = getServiceName(item.primaryService);
  const badge = `<span class="service-badge service-${item.primaryService}">${serviceName}</span>`;

  // 渲染到 UI
}

function getServiceName(serviceId: string): string {
  const names = {
    'weibo': '微博',
    'r2': 'R2',
    'nami': '纳米',
    'jd': '京东'
  };
  return names[serviceId] || serviceId;
}
```

---

## 🎨 添加新图床

### 示例：添加纳米图床

#### 1. 创建 TypeScript 上传器

复制 `src/uploaders/template/TemplateUploader.ts` 到 `src/uploaders/nami/NamiUploader.ts`：

```typescript
export class NamiUploader extends BaseUploader {
  readonly serviceId = 'nami';
  readonly serviceName = '纳米图床';

  protected getRustCommand() {
    return 'upload_to_nami';
  }

  async validateConfig(config: any) {
    // 验证 Cookie 等
  }

  async upload(filePath, options, onProgress) {
    // 调用 Rust 上传
  }

  getPublicUrl(result) {
    return result.url;
  }
}
```

#### 2. 实现 Rust 命令

创建 `src-tauri/src/commands/nami.rs`：

```rust
#[tauri::command]
pub async fn upload_to_nami(
    window: Window,
    id: String,
    file_path: String,
    cookie: String,
) -> Result<NamiRustResult, String> {
    // 抓包分析纳米图床的上传 API
    // 实现上传逻辑
    // 发送进度事件
}
```

#### 3. 注册上传器

在 `src/uploaders/index.ts` 中：

```typescript
import { NamiUploader } from './nami/NamiUploader';

export function initializeUploaders() {
  UploaderFactory.register('weibo', () => new WeiboUploader());
  UploaderFactory.register('r2', () => new R2Uploader());
  UploaderFactory.register('nami', () => new NamiUploader());  // 新增
}
```

在 `src-tauri/src/commands/mod.rs` 中：

```rust
pub mod upload;
pub mod r2;
pub mod nami;  // 新增
```

在 `src-tauri/src/main.rs` 中：

```rust
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    commands::nami::upload_to_nami,  // 新增
])
```

#### 4. 添加配置类型

在 `src/config/types.ts` 中：

```typescript
export interface NamiServiceConfig extends BaseServiceConfig {
  cookie: string;
}

export interface UserConfig {
  // ...
  services: {
    weibo?: WeiboServiceConfig;
    r2?: R2ServiceConfig;
    nami?: NamiServiceConfig;  // 新增
    // ...
  };
}
```

#### 5. 更新 UI

在设置页面添加纳米图床配置项，在主力图床选择器中启用纳米选项。

---

## 🧪 测试

### 测试微博上传

```typescript
import { WeiboUploader } from './uploaders/weibo';

const uploader = new WeiboUploader();

const result = await uploader.upload(
  '/path/to/image.jpg',
  { config: { enabled: true, cookie: '...' } },
  (percent) => console.log(`进度: ${percent}%`)
);

console.log('微博上传结果:', result);
```

### 测试 R2 上传

```typescript
import { R2Uploader } from './uploaders/r2';

const uploader = new R2Uploader();

const result = await uploader.upload(
  '/path/to/image.jpg',
  {
    config: {
      enabled: true,
      accountId: '...',
      accessKeyId: '...',
      secretAccessKey: '...',
      bucketName: '...',
      path: 'images/',
      publicDomain: 'https://cdn.example.com'
    }
  }
);

console.log('R2 上传结果:', result);
```

### 测试完整流程

```typescript
import { UploadOrchestrator } from './core';

const orchestrator = new UploadOrchestrator();

const config: UserConfig = {
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

console.log('上传成功', historyItem);
// historyItem.primaryResult: 微博上传结果
// historyItem.backups: R2 备份结果
```

---

## 📦 构建和部署

### 开发环境

```bash
# 安装依赖
npm install
cd src-tauri && cargo build

# 开发模式
npm run tauri dev
```

### 生产构建

```bash
# 构建应用
npm run tauri build
```

---

## 🔧 故障排查

### 问题 1: TypeScript 编译错误

**错误**: `Cannot find module './uploaders'`

**解决**: 确保已创建所有必要的文件和 index.ts 导出。

### 问题 2: Rust 编译错误

**错误**: `use of undeclared type 'Client'`

**解决**: 确保已在 `Cargo.toml` 中添加 AWS SDK 依赖。

### 问题 3: R2 上传失败

**错误**: `R2 上传功能需要添加 AWS SDK 依赖`

**解决**: 完成步骤 1 和步骤 2，实现完整的 R2 上传逻辑。

### 问题 4: 上传器未注册

**错误**: `未知的图床服务: "weibo"`

**解决**: 确保在应用启动时调用了 `initializeUploaders()`。

---

## 📚 参考资料

- **核心接口**: `src/uploaders/base/IUploader.ts`
- **基类实现**: `src/uploaders/base/BaseUploader.ts`
- **工厂模式**: `src/uploaders/base/UploaderFactory.ts`
- **配置类型**: `src/config/types.ts`
- **集成示例**: `src/integration-example.ts`
- **模板上传器**: `src/uploaders/template/TemplateUploader.ts`
- **迁移计划**: `C:\Users\Jiawei\.claude\plans\elegant-fluttering-llama.md`

---

## 🎯 下一步

1. ✅ 完成 R2 Rust 命令实现（添加 AWS SDK）
2. ✅ 在 main.ts 中集成新架构
3. ✅ 测试微博和 R2 上传
4. ✅ 更新 UI（设置页面、历史记录页面）
5. ✅ 添加更多图床（纳米、京东等）
6. ✅ 完善错误处理和用户提示
7. ✅ 编写单元测试

---

## 💡 最佳实践

1. **渐进式迁移**: 先迁移微博，测试通过后再添加其他图床
2. **保留旧代码**: 在迁移完成前不要删除 `coreLogic.ts` 和 `weiboUploader.ts`
3. **备份配置**: 迁移前备份用户的 `.settings.dat` 文件
4. **错误日志**: 使用 `console.log` 和 `console.error` 记录详细日志
5. **测试用例**: 为每个上传器编写测试用例

---

如有问题，请参考 `integration-example.ts` 或查看已实现的 `WeiboUploader` 和 `R2Uploader`。
