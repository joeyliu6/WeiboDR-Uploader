# 插件化架构详解

> 理解 WeiboDR-Uploader 的核心设计理念

---

## 📋 学习目标

完成本节学习后，你将能够：

- ✅ 理解什么是插件化架构
- ✅ 掌握插件化架构的优势
- ✅ 理解三层结构：Interface → BaseClass → Concrete
- ✅ 能够设计自己的插件化系统

---

## 前置知识

- 面向对象编程基础
- 接口（interface）概念
- 继承（extends）概念

---

## 1. 什么是插件化架构？

### 1.1 传统架构 vs 插件化架构

#### 场景：支持多个图床服务

**传统架构**（硬编码）：

```typescript
// ❌ 所有逻辑写在一个文件里
class Uploader {
  async upload(file, service) {
    if (service === 'weibo') {
      // 微博上传逻辑（100行代码）
      const cookie = this.config.weiboCookie;
      const response = await fetch('https://weibo.com/api', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: formData
      });
      // ...
    } else if (service === 'r2') {
      // R2上传逻辑（150行代码）
      const credentials = this.config.r2Credentials;
      const s3Client = new S3Client(credentials);
      // ...
    } else if (service === 'tcl') {
      // TCL上传逻辑（80行代码）
      const response = await fetch('https://tcl.com/api', {
        method: 'POST',
        body: formData
      });
      // ...
    }
    // 每添加一个图床，这个文件就增加100+行代码
  }
}
```

**问题**：
- ❌ 所有代码耦合在一起，难以维护
- ❌ 添加新图床需要修改核心文件，容易出错
- ❌ 无法单独测试某个图床的逻辑
- ❌ 代码重复（如进度监听、错误处理）

---

**插件化架构**：

```typescript
// ✅ 每个图床独立一个插件
interface IUploader {
  upload(file): Promise<Result>;
}

class WeiboUploader implements IUploader {
  async upload(file) {
    // 只关注微博上传逻辑
  }
}

class R2Uploader implements IUploader {
  async upload(file) {
    // 只关注R2上传逻辑
  }
}

class TCLUploader implements IUploader {
  async upload(file) {
    // 只关注TCL上传逻辑
  }

// 使用工厂模式创建
const uploader = UploaderFactory.create(service);
await uploader.upload(file);
```

**优势**：
- ✅ 每个图床独立，互不影响
- ✅ 添加新图床不需要修改现有代码
- ✅ 可以单独测试每个上传器
- ✅ 代码复用（通用逻辑在基类中）

---

### 1.2 插件化架构的核心思想

**"开放-封闭原则"**（Open-Closed Principle）：

> 软件实体应该对扩展开放，对修改封闭。

**解释**：
- **对扩展开放**：可以轻松添加新功能（新图床）
- **对修改封闭**：添加新功能时不需要修改现有代码

**在本项目中的体现**：

```typescript
// 添加新图床（扩展）
class NewUploader extends BaseUploader {
  // 实现接口方法
}

// 注册新图床
UploaderFactory.register('new', () => new NewUploader());

// ✅ 没有修改任何现有代码！
// ✅ WeiboUploader、R2Uploader 等完全不受影响！
```

---

## 2. 三层架构详解

WeiboDR-Uploader 的插件化架构采用**三层设计**：

```
┌─────────────────────────────────────────┐
│    第1层：接口层 (IUploader)             │
│    - 定义"什么是上传器"                   │
│    - 规定所有上传器必须实现的方法          │
└─────────────────────────────────────────┘
                 ↑ implements
┌─────────────────────────────────────────┐
│    第2层：抽象基类 (BaseUploader)        │
│    - 实现通用逻辑                         │
│    - 提供辅助方法                         │
│    - 避免代码重复                         │
└─────────────────────────────────────────┘
                 ↑ extends
┌─────────────────────────────────────────┐
│    第3层：具体实现                        │
│    - WeiboUploader                      │
│    - R2Uploader                         │
│    - TCLUploader                        │
│    - ...                                │
└─────────────────────────────────────────┘
```

---

### 2.1 第1层：接口层 (IUploader)

**作用**：定义规范，确保所有上传器有统一的 API。

```typescript
// src/uploaders/base/IUploader.ts
export interface IUploader {
  // 必须实现的属性
  readonly serviceId: string;
  readonly serviceName: string;

  // 必须实现的方法
  validateConfig(config: any): Promise<ValidationResult>;
  upload(filePath: string, options: UploadOptions, onProgress?: ProgressCallback): Promise<UploadResult>;
  getPublicUrl(result: UploadResult): string;

  // 可选方法
  testConnection?(): Promise<ConnectionTestResult>;
}
```

**类比**：

想象一个"插座标准"：

```
所有插头必须：
1. 有两个金属片（对应 serviceId、serviceName）
2. 能传输电流（对应 upload 方法）
3. 能测试电压（对应 testConnection 方法）

这样，任何符合标准的插头都能插到插座上！
```

---

### 2.2 第2层：抽象基类 (BaseUploader)

**作用**：实现所有上传器共享的逻辑，避免代码重复。

```typescript
// src/uploaders/base/BaseUploader.ts
export abstract class BaseUploader implements IUploader {
  // 子类必须实现（抽象）
  abstract readonly serviceId: string;
  abstract readonly serviceName: string;
  abstract validateConfig(config: any): Promise<ValidationResult>;
  abstract upload(filePath: string, options: UploadOptions, onProgress?: ProgressCallback): Promise<UploadResult>;
  abstract getPublicUrl(result: UploadResult): string;

  // 通用方法（所有子类共享）
  protected async uploadViaRust(filePath: string, params: Record<string, any>, onProgress?: ProgressCallback): Promise<any> {
    // 1. 生成唯一 uploadId
    const uploadId = `${this.serviceId}_${Date.now()}_${Math.random().toString(36)}`;

    // 2. 监听进度事件
    const unlisten = await listen<ProgressEvent>('upload://progress', (event) => {
      if (event.payload.id === uploadId) {
        const percent = (event.payload.progress / event.payload.total) * 100;
        onProgress?.(percent);
      }
    });

    try {
      // 3. 调用 Rust 命令
      const result = await invoke(this.getRustCommand(), {
        id: uploadId,
        filePath,
        ...params
      });
      return result;
    } finally {
      // 4. 清理监听器
      unlisten();
    }
  }

  // 辅助方法
  protected isEmpty(value: string | undefined | null): boolean {
    return !value || value.trim().length === 0;
  }

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[${this.serviceName}]`;
    console[level](prefix, message, data ?? '');
  }

  // 子类需要实现
  protected abstract getRustCommand(): string;
}
```

**类比**：

想象一个"通用遥控器"：

```
所有电器遥控器都有：
- 按键（接口要求）
- 电池仓（通用设计，基类实现）
- 红外发射器（通用设计，基类实现）

但每个遥控器的信号编码不同（子类实现）
```

---

### 2.3 第3层：具体实现

**作用**：实现特定图床的业务逻辑。

#### 简单实现示例（TCL 图床）

```typescript
// src/uploaders/tcl/TCLUploader.ts
export class TCLUploader extends BaseUploader {
  // 实现抽象属性
  readonly serviceId = 'tcl';
  readonly serviceName = 'TCL 图床';

  // 实现抽象方法
  protected getRustCommand(): string {
    return 'upload_to_tcl';
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    // TCL 无需配置
    return { valid: true };
  }

  async upload(filePath: string, options: UploadOptions, onProgress?: ProgressCallback): Promise<UploadResult> {
    // 使用基类的通用方法
    const rustResult = await this.uploadViaRust(filePath, {}, onProgress);

    // 转换为标准格式
    return {
      serviceId: 'tcl',
      fileKey: rustResult.url,
      url: rustResult.url,
      size: rustResult.size
    };
  }

  getPublicUrl(result: UploadResult): string {
    return result.url;
  }
}
```

**代码量**：只需约 **50 行代码**！

---

#### 复杂实现示例（微博图床）

```typescript
// src/uploaders/weibo/WeiboUploader.ts
export class WeiboUploader extends BaseUploader {
  readonly serviceId = 'weibo';
  readonly serviceName = '新浪微博';

  protected getRustCommand(): string {
    return 'upload_file_stream';
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!config || !config.cookie) {
      errors.push('请先配置微博 Cookie');
    }

    if (config?.cookie && !config.cookie.includes('SUB=')) {
      errors.push('Cookie 必须包含 SUB 字段');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async upload(filePath: string, options: UploadOptions, onProgress?: ProgressCallback): Promise<UploadResult> {
    const validation = await this.validateConfig(options.config);
    if (!validation.valid) {
      throw new Error(`配置错误: ${validation.errors?.join(', ')}`);
    }

    const rustResult = await this.uploadViaRust(
      filePath,
      { weiboCookie: options.config.cookie },
      onProgress
    );

    return {
      serviceId: 'weibo',
      fileKey: rustResult.pid,
      url: `https://tvax1.sinaimg.cn/large/${rustResult.pid}.jpg`,
      size: rustResult.size,
      metadata: { pid: rustResult.pid }
    };
  }

  getPublicUrl(result: UploadResult): string {
    // 支持代理前缀
    const baseUrl = `https://tvax1.sinaimg.cn/large/${result.fileKey}.jpg`;

    if (this.config.linkPrefixConfig?.enabled) {
      const prefix = this.config.linkPrefixConfig.selectedPrefix;
      return prefix + baseUrl;
    }

    return baseUrl;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://m.weibo.cn/api/config', {
        headers: { Cookie: this.config.cookie }
      });

      return {
        success: response.ok,
        message: response.ok ? '连接成功' : 'Cookie 可能已过期'
      };
    } catch (error) {
      return {
        success: false,
        error: `网络错误: ${error.message}`
      };
    }
  }
}
```

**代码量**：约 **100 行代码**，但实现了完整功能！

---

## 3. 插件化架构的优势

### 3.1 易于扩展

**场景**：需要添加"GitHub 图床"

**传统架构**：
```
1. 打开 Uploader.ts（1000+行）
2. 找到合适的位置插入代码
3. 添加 else if 分支（100行）
4. 修改配置类型
5. 修改 UI
6. 担心影响其他图床
```

**插件化架构**：
```
1. 创建 GitHubUploader.ts（80行）
2. 继承 BaseUploader
3. 实现 4 个方法
4. 注册到工厂
5. 完成！
```

---

### 3.2 代码复用

**通用逻辑在基类中实现一次，所有子类共享**：

| 功能 | 不使用基类 | 使用基类 |
|------|----------|---------|
| 进度监听 | 每个上传器 50 行 | 基类 50 行，子类 0 行 |
| Rust 调用 | 每个上传器 30 行 | 基类 30 行，子类 0 行 |
| 错误处理 | 每个上传器 20 行 | 基类 20 行，子类 0 行 |
| **8个上传器总计** | **800 行** | **100 行** |

**节省代码**：700 行！

---

### 3.3 易于测试

**单元测试**：

```typescript
// 测试 TCL 上传器
describe('TCLUploader', () => {
  let uploader: TCLUploader;

  beforeEach(() => {
    uploader = new TCLUploader();
  });

  test('validateConfig 应该始终返回有效', async () => {
    const result = await uploader.validateConfig({});
    expect(result.valid).toBe(true);
  });

  test('getPublicUrl 应该返回原始 URL', () => {
    const result = { serviceId: 'tcl', url: 'https://example.com/image.jpg' };
    expect(uploader.getPublicUrl(result)).toBe('https://example.com/image.jpg');
  });
});
```

**集成测试**：

```typescript
// 测试多图床上传
test('应该并行上传到 TCL 和微博', async () => {
  const multiUploader = new MultiServiceUploader();
  const result = await multiUploader.uploadToMultipleServices(
    '/path/to/image.jpg',
    ['tcl', 'weibo'],
    mockConfig
  );

  expect(result.results).toHaveLength(2);
  expect(result.results[0].status).toBe('success');
  expect(result.results[1].status).toBe('success');
});
```

---

### 3.4 易于维护

**场景1：修改微博上传逻辑**

```
传统架构：
- 打开 Uploader.ts（1000+行）
- 找到微博相关代码（在第 200-300 行之间）
- 修改代码
- 担心影响 R2、TCL 等其他图床

插件化架构：
- 打开 WeiboUploader.ts（100行）
- 修改代码
- 不影响任何其他图床 ✅
```

**场景2：删除某个图床**

```
传统架构：
- 删除 Uploader.ts 中的相关代码
- 删除配置类型
- 删除 UI 元素
- 检查是否有遗漏

插件化架构：
- 删除 WeiboUploader.ts
- 取消注册：删除 1 行代码
- 完成！
```

---

## 4. 完整实例：添加新图床

### 4.1 需求

添加"示例图床"（Example Image Hosting），要求：
- 无需认证（类似 TCL）
- API 端点：`https://example.com/upload`
- 返回格式：`{ "url": "https://cdn.example.com/xxx.jpg" }`

---

### 4.2 实现步骤

#### 步骤1：定义配置类型

```typescript
// src/config/types.ts

// 1. 添加到 ServiceType
export type ServiceType = 'weibo' | 'r2' | 'tcl' | 'example';
//                                                    ^^^^^^^ 新增

// 2. 定义配置接口
export interface ExampleServiceConfig extends BaseServiceConfig {
  // Example 图床无需额外配置
}

// 3. 添加到 UserConfig
export interface UserConfig {
  services: {
    weibo?: WeiboServiceConfig;
    r2?: R2ServiceConfig;
    tcl?: TCLServiceConfig;
    example?: ExampleServiceConfig;  // 新增
  };
}

// 4. 添加到默认配置
export const DEFAULT_CONFIG: UserConfig = {
  services: {
    // ...
    example: {
      enabled: true  // 默认启用
    }
  }
};
```

---

#### 步骤2：实现上传器

```typescript
// src/uploaders/example/ExampleUploader.ts

import { BaseUploader } from '../base/BaseUploader';
import { UploadResult, ValidationResult, UploadOptions, ProgressCallback } from '../base/types';
import { ExampleServiceConfig } from '../../config/types';

/**
 * Rust 返回的示例图床上传结果
 */
interface ExampleRustResult {
  url: string;
}

/**
 * 示例图床上传器
 * 演示如何添加一个新图床
 */
export class ExampleUploader extends BaseUploader {
  readonly serviceId = 'example';
  readonly serviceName = '示例图床';

  protected getRustCommand(): string {
    return 'upload_to_example';
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    // 无需配置，直接返回有效
    return { valid: true };
  }

  async upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    this.log('info', '开始上传到示例图床', { filePath });

    try {
      // 调用基类的 Rust 上传方法
      const rustResult = await this.uploadViaRust(
        filePath,
        {},  // 无需参数
        onProgress
      ) as ExampleRustResult;

      this.log('info', '上传成功', { url: rustResult.url });

      return {
        serviceId: 'example',
        fileKey: rustResult.url,
        url: rustResult.url
      };
    } catch (error) {
      this.log('error', '上传失败', error);
      throw new Error(`示例图床上传失败: ${error}`);
    }
  }

  getPublicUrl(result: UploadResult): string {
    return result.url;
  }
}
```

**代码量**：仅 **60 行代码**！

---

#### 步骤3：注册到工厂

```typescript
// src/uploaders/index.ts

import { UploaderFactory } from './base/UploaderFactory';
import { WeiboUploader } from './weibo/WeiboUploader';
import { R2Uploader } from './r2/R2Uploader';
import { TCLUploader } from './tcl/TCLUploader';
import { ExampleUploader } from './example/ExampleUploader';  // 导入

export function initializeUploaders() {
  UploaderFactory.register('weibo', () => new WeiboUploader());
  UploaderFactory.register('r2', () => new R2Uploader());
  UploaderFactory.register('tcl', () => new TCLUploader());
  UploaderFactory.register('example', () => new ExampleUploader());  // 注册
}
```

**只需 1 行代码**！

---

#### 步骤4：实现 Rust 命令

```rust
// src-tauri/src/commands/example.rs

use serde::{Deserialize, Serialize};
use tauri::Window;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExampleUploadResult {
    pub url: String,
}

#[tauri::command]
pub async fn upload_to_example(
    window: Window,
    id: String,
    file_path: String,
) -> Result<ExampleUploadResult, String> {
    // 1. 读取文件
    let file_bytes = std::fs::read(&file_path)
        .map_err(|e| format!("无法读取文件: {}", e))?;

    // 2. 构建 multipart form
    let client = reqwest::Client::new();
    let form = reqwest::multipart::Form::new()
        .part("file", reqwest::multipart::Part::bytes(file_bytes));

    // 3. 发送请求
    let response = client
        .post("https://example.com/upload")
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("上传失败: {}", e))?;

    // 4. 解析响应
    let result: ExampleUploadResult = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    // 5. 发送进度事件
    let _ = window.emit("upload://progress", serde_json::json!({
        "id": id,
        "progress": 100,
        "total": 100
    }));

    Ok(result)
}
```

---

#### 步骤5：注册 Rust 命令

```rust
// src-tauri/src/main.rs

mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::upload::upload_file_stream,
            commands::r2::upload_to_r2,
            commands::tcl::upload_to_tcl,
            commands::example::upload_to_example,  // 注册
            // ...
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

### 4.3 完成！

**总代码量**：
- TypeScript: ~80 行
- Rust: ~50 行
- **总计: ~130 行**

**修改文件**：
- 新增: 2 个文件（ExampleUploader.ts、example.rs）
- 修改: 3 个文件（types.ts +10行、index.ts +2行、main.rs +1行）

**耗时**：约 **30 分钟**！

---

## 5. 总结

### 🎯 本节要点

1. **插件化架构的定义**：
   - 将功能模块化，每个模块独立实现
   - 遵循"开放-封闭原则"

2. **三层结构**：
   - 第1层：接口层（定义规范）
   - 第2层：抽象基类（通用逻辑）
   - 第3层：具体实现（业务逻辑）

3. **优势**：
   - 易于扩展（添加新图床 ~100 行代码）
   - 代码复用（节省 700+ 行代码）
   - 易于测试（独立单元测试）
   - 易于维护（不影响其他模块）

---

### 📝 检查清单

学完本节后，你应该能够：

- [ ] 解释插件化架构的优势
- [ ] 说出三层结构的作用
- [ ] 理解 BaseUploader 如何避免代码重复
- [ ] 能够按照模板添加新图床
- [ ] 知道为什么要用接口 + 抽象类

---

### 🚀 下一步

现在你已经理解了插件化架构，接下来让我们学习其他设计模式：

**[下一节：设计模式应用 →](02-design-patterns.md)**

在下一节中，你将学习：
- 工厂模式详解
- 策略模式应用
- 编排器模式
- 单例模式

---

<div align="center">

[⬆ 返回教程目录](../README.md) | [← 上一章](../../01-getting-started/05-directory-tour.md) | [下一节 →](02-design-patterns.md)

</div>
