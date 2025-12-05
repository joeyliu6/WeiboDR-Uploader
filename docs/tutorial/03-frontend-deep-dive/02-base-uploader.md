# BaseUploader 抽象类

> 理解如何通过抽象类实现代码复用

---

## 📋 学习目标

完成本节学习后，你将能够：

- ✅ 理解抽象类的作用
- ✅ 掌握 uploadViaRust() 核心方法的实现
- ✅ 理解进度监听的实现机制
- ✅ 学会使用辅助方法简化代码

---

## 前置知识

- TypeScript 抽象类（abstract class）
- async/await 异步编程
- Tauri 的 invoke 和 listen API

---

## 1. 为什么需要抽象类？

### 1.1 问题场景

假设没有抽象基类，每个上传器都需要实现完整的上传逻辑：

```typescript
// ❌ WeiboUploader.ts - 重复代码
class WeiboUploader implements IUploader {
  async upload(filePath, options, onProgress?) {
    // 1. 生成唯一 uploadId
    const uploadId = `weibo_${Date.now()}_${Math.random()}`;

    // 2. 监听进度事件
    const unlisten = await listen('upload://progress', (event) => {
      if (event.payload.id === uploadId) {
        const percent = (event.payload.progress / event.payload.total) * 100;
        onProgress?.(percent);
      }
    });

    try {
      // 3. 调用 Rust 命令
      const result = await invoke('upload_file_stream', {
        id: uploadId,
        filePath,
        weiboCookie: options.config.cookie
      });
      return result;
    } finally {
      // 4. 清理监听器
      unlisten();
    }
  }
}

// ❌ TCLUploader.ts - 完全相同的代码！
class TCLUploader implements IUploader {
  async upload(filePath, options, onProgress?) {
    // 1. 生成唯一 uploadId
    const uploadId = `tcl_${Date.now()}_${Math.random()}`;

    // 2. 监听进度事件
    const unlisten = await listen('upload://progress', (event) => {
      if (event.payload.id === uploadId) {
        const percent = (event.payload.progress / event.payload.total) * 100;
        onProgress?.(percent);
      }
    });

    try {
      // 3. 调用 Rust 命令
      const result = await invoke('upload_to_tcl', {
        id: uploadId,
        filePath
      });
      return result;
    } finally {
      // 4. 清理监听器
      unlisten();
    }
  }
}

// 问题：8个上传器 × 30行重复代码 = 240行重复代码！
```

---

### 1.2 使用抽象基类的解决方案

```typescript
// ✅ BaseUploader.ts - 通用逻辑实现一次
abstract class BaseUploader implements IUploader {
  protected async uploadViaRust(filePath, params, onProgress?) {
    // 通用上传逻辑（30行代码）
    // 所有子类共享这个方法
  }
}

// ✅ WeiboUploader.ts - 只需调用基类方法
class WeiboUploader extends BaseUploader {
  async upload(filePath, options, onProgress?) {
    // 调用基类的通用方法
    const rustResult = await this.uploadViaRust(
      filePath,
      { weiboCookie: options.config.cookie },
      onProgress
    );
    return this.convertResult(rustResult);
  }
}

// ✅ TCLUploader.ts - 同样只需调用基类方法
class TCLUploader extends BaseUploader {
  async upload(filePath, options, onProgress?) {
    const rustResult = await this.uploadViaRust(filePath, {}, onProgress);
    return this.convertResult(rustResult);
  }
}

// 优势：8个上传器 × 5行调用代码 = 40行代码（节省200行！）
```

---

## 2. BaseUploader 完整源码解析

**文件位置**：`src/uploaders/base/BaseUploader.ts`

### 2.1 类定义和抽象成员

```typescript
export abstract class BaseUploader implements IUploader {
  // 子类必须实现的属性（抽象）
  abstract readonly serviceId: string;
  abstract readonly serviceName: string;

  // 子类必须实现的方法（抽象）
  protected abstract getRustCommand(): string;
  abstract validateConfig(config: any): Promise<ValidationResult>;
  abstract upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult>;
  abstract getPublicUrl(result: UploadResult): string;

  // ... 通用方法（具体实现）
}
```

**关键点**：

1. **`abstract class`**：
   - 不能直接实例化（`new BaseUploader()` 会报错）
   - 只能被继承

2. **`abstract` 成员**：
   - 只声明，不实现
   - 子类**必须**实现
   - 提供类型安全

3. **`protected` 方法**：
   - 只能在类内部和子类中访问
   - 外部无法调用

---

### 2.2 uploadViaRust() 核心方法 ⭐⭐⭐

这是整个基类最重要的方法！

```typescript
protected async uploadViaRust(
  filePath: string,
  params: Record<string, any>,
  onProgress?: ProgressCallback
): Promise<any> {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤1：生成唯一上传 ID
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const uploadId = `${this.serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[${this.serviceName}] 开始上传... (ID: ${uploadId})`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 步骤2：设置进度监听器
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let unlisten: UnlistenFn | undefined;

  if (onProgress) {
    try {
      unlisten = await listen<ProgressEvent>('upload://progress', (event) => {
        // 只处理当前上传任务的进度事件
        if (event.payload.id === uploadId) {
          const percent = Math.round((event.payload.progress / event.payload.total) * 100);
          onProgress(percent);
        }
      });
    } catch (error) {
      console.warn(`[${this.serviceName}] 无法监听进度事件:`, error);
      // 继续执行，不因为进度监听失败而中断上传
    }
  }

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 步骤3：调用 Rust 命令
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const result = await invoke(this.getRustCommand(), {
      id: uploadId,
      filePath,
      ...params
    });

    console.log(`[${this.serviceName}] 上传成功:`, result);
    return result;

  } catch (error: any) {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 步骤4：错误处理
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.error(`[${this.serviceName}] 上传失败:`, error);

    // 转换错误信息
    const errorMessage = error.message || error.toString();
    throw new Error(`${this.serviceName}上传失败: ${errorMessage}`);

  } finally {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 步骤5：清理进度监听器（防止内存泄漏）
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (unlisten) {
      unlisten();
    }
  }
}
```

---

### 2.3 uploadViaRust() 执行流程图

```
开始上传
    ↓
┌─────────────────────────────────────┐
│ 步骤1：生成唯一 uploadId            │
│ 格式：serviceId_timestamp_random    │
│ 示例：tcl_1699000000000_abc123      │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 步骤2：设置进度监听器                │
│ listen('upload://progress')         │
│ 过滤：只处理匹配 uploadId 的事件    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 步骤3：调用 Rust 命令                │
│ invoke(getRustCommand(), {          │
│   id: uploadId,                     │
│   filePath,                         │
│   ...params                         │
│ })                                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Rust 后端执行上传                    │
│ ┌─ 读取文件                         │
│ ├─ 构建 HTTP 请求                   │
│ ├─ 发送到图床 API                   │
│ └─ 发送进度事件 emit()              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 前端接收进度事件                     │
│ ┌─ listen() 回调触发                │
│ ├─ 检查 uploadId 是否匹配           │
│ ├─ 计算百分比                       │
│ └─ 调用 onProgress(percent)         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Rust 返回结果                        │
│ Promise resolved                    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 步骤4：返回结果给调用方              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 步骤5：清理监听器（finally）         │
│ unlisten()                          │
└─────────────────────────────────────┘
    ↓
上传完成
```

---

### 2.4 进度监听的实现细节

#### 为什么需要 uploadId？

**场景**：同时上传3个文件到TCL图床

```typescript
// 同时调用3次 upload
Promise.all([
  tclUploader.upload('file1.jpg', ...),  // uploadId: tcl_1699000001_abc
  tclUploader.upload('file2.jpg', ...),  // uploadId: tcl_1699000002_def
  tclUploader.upload('file3.jpg', ...)   // uploadId: tcl_1699000003_ghi
]);

// Rust 后端发送进度事件
emit('upload://progress', { id: 'tcl_1699000001_abc', progress: 50, total: 100 });
emit('upload://progress', { id: 'tcl_1699000002_def', progress: 30, total: 100 });
emit('upload://progress', { id: 'tcl_1699000003_ghi', progress: 80, total: 100 });

// 前端监听器通过 uploadId 区分
listen('upload://progress', (event) => {
  if (event.payload.id === 'tcl_1699000001_abc') {
    // 更新 file1 的进度条
  } else if (event.payload.id === 'tcl_1699000002_def') {
    // 更新 file2 的进度条
  } else if (event.payload.id === 'tcl_1699000003_ghi') {
    // 更新 file3 的进度条
  }
});
```

**如果没有 uploadId**：所有进度事件会混在一起，无法区分！

---

#### 为什么需要 unlisten()？

**内存泄漏问题**：

```typescript
// ❌ 忘记清理监听器
async function upload() {
  await listen('upload://progress', (event) => {
    console.log('进度:', event.payload.progress);
  });
  // 上传完成后，监听器还在！
}

// 上传 100 次
for (let i = 0; i < 100; i++) {
  await upload();
}

// 结果：有 100 个监听器在内存中！
// 每次进度事件会触发 100 次回调！
```

**正确做法**：

```typescript
// ✅ 清理监听器
async function upload() {
  const unlisten = await listen('upload://progress', (event) => {
    console.log('进度:', event.payload.progress);
  });

  try {
    // 上传逻辑
  } finally {
    unlisten();  // 确保清理
  }
}
```

---

### 2.5 testConnection() 默认实现

```typescript
async testConnection(): Promise<ConnectionTestResult> {
  return {
    success: false,
    error: '此服务暂未实现连接测试'
  };
}
```

**说明**：
- 提供默认实现，子类可选择覆盖
- TCL、JD 等无需认证的图床不需要测试连接
- 微博、R2 等需要认证的图床可以覆盖此方法

---

## 3. 辅助方法

### 3.1 generateUniqueId()

```typescript
protected generateUniqueId(): string {
  return `${this.serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
```

**作用**：生成唯一标识符

**示例输出**：
```
weibo_1699000000000_a1b2c3d4
tcl_1699000001234_x9y8z7w6
```

**用途**：
- 上传任务 ID
- 临时文件名
- 日志标识

---

### 3.2 isEmpty()

```typescript
protected isEmpty(value: string | undefined | null): boolean {
  return !value || value.trim().length === 0;
}
```

**作用**：检查字符串是否为空

**示例**：

```typescript
// 用于配置验证
async validateConfig(config: any): Promise<ValidationResult> {
  if (this.isEmpty(config.cookie)) {
    return { valid: false, errors: ['请配置 Cookie'] };
  }
  return { valid: true };
}

// 测试
isEmpty(undefined)    // true
isEmpty(null)         // true
isEmpty('')           // true
isEmpty('   ')        // true
isEmpty('hello')      // false
```

---

### 3.3 log()

```typescript
protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
  const prefix = `[${this.serviceName}]`;

  switch (level) {
    case 'info':
      console.log(prefix, message, data ?? '');
      break;
    case 'warn':
      console.warn(prefix, message, data ?? '');
      break;
    case 'error':
      console.error(prefix, message, data ?? '');
      break;
  }
}
```

**作用**：统一的日志输出格式

**示例输出**：

```
[新浪微博] 开始上传... { filePath: '/path/to/image.jpg' }
[TCL 图床] 上传成功 { url: 'https://...' }
[Cloudflare R2] 上传失败 Error: Network error
```

**优势**：
- 统一格式，易于搜索和过滤
- 自动添加服务名称前缀
- 支持可选的数据参数

---

## 4. 子类如何使用基类

### 4.1 TCLUploader 示例

```typescript
export class TCLUploader extends BaseUploader {
  readonly serviceId = 'tcl';
  readonly serviceName = 'TCL 图床';

  protected getRustCommand(): string {
    return 'upload_to_tcl';
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    return { valid: true };
  }

  async upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    // 使用基类的 log 方法
    this.log('info', '开始上传到 TCL', { filePath });

    try {
      // 使用基类的 uploadViaRust 方法
      const rustResult = await this.uploadViaRust(
        filePath,
        {},  // TCL 无需参数
        onProgress
      ) as TCLRustResult;

      this.log('info', 'TCL 上传成功', { url: rustResult.url });

      return {
        serviceId: 'tcl',
        fileKey: rustResult.url,
        url: rustResult.url,
        size: rustResult.size
      };
    } catch (error) {
      this.log('error', 'TCL 上传失败', error);
      throw new Error(`TCL 图床上传失败: ${error}`);
    }
  }

  getPublicUrl(result: UploadResult): string {
    return result.url;
  }
}
```

**使用基类的方法**：
- ✅ `this.uploadViaRust()` - 通用上传逻辑
- ✅ `this.log()` - 统一日志输出

**没有重复代码**！

---

### 4.2 WeiboUploader 示例

```typescript
export class WeiboUploader extends BaseUploader {
  readonly serviceId = 'weibo';
  readonly serviceName = '新浪微博';

  protected getRustCommand(): string {
    return 'upload_file_stream';
  }

  async validateConfig(config: any): Promise<ValidationResult> {
    // 使用基类的 isEmpty 方法
    if (this.isEmpty(config?.cookie)) {
      return { valid: false, errors: ['请配置微博 Cookie'] };
    }
    return { valid: true };
  }

  async upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    const validation = await this.validateConfig(options.config);
    if (!validation.valid) {
      throw new Error(`配置错误: ${validation.errors?.join(', ')}`);
    }

    // 使用基类的 uploadViaRust 方法
    const rustResult = await this.uploadViaRust(
      filePath,
      { weiboCookie: options.config.cookie },
      onProgress
    );

    return {
      serviceId: 'weibo',
      fileKey: rustResult.pid,
      url: `https://tvax1.sinaimg.cn/large/${rustResult.pid}.jpg`,
      size: rustResult.size
    };
  }

  getPublicUrl(result: UploadResult): string {
    return `https://tvax1.sinaimg.cn/large/${result.fileKey}.jpg`;
  }
}
```

**使用基类的方法**：
- ✅ `this.isEmpty()` - 检查配置是否为空
- ✅ `this.uploadViaRust()` - 通用上传逻辑

---

## 5. 总结

### 🎯 本节要点

1. **抽象类的作用**：
   - 实现通用逻辑，避免代码重复
   - 提供抽象方法，强制子类实现
   - 节省代码量：8个上传器节省200+行代码

2. **uploadViaRust() 核心方法**：
   - 生成唯一 uploadId
   - 监听进度事件
   - 调用 Rust 命令
   - 清理监听器

3. **辅助方法**：
   - `generateUniqueId()` - 生成唯一标识
   - `isEmpty()` - 检查字符串为空
   - `log()` - 统一日志输出

4. **设计原则**：
   - DRY（Don't Repeat Yourself）
   - 关注点分离
   - 代码复用

---

### 📝 检查清单

学完本节后，你应该能够：

- [ ] 解释抽象类的作用
- [ ] 说出 uploadViaRust() 的5个步骤
- [ ] 理解为什么需要 uploadId
- [ ] 理解为什么需要 unlisten()
- [ ] 知道如何在子类中使用基类方法

---

### 🚀 下一步

现在你已经理解了抽象基类，接下来让我们学习工厂模式：

**[下一节：UploaderFactory 工厂模式 →](03-uploader-factory.md)**

在下一节中，你将学习：
- 工厂模式的作用
- 如何注册和创建上传器
- 工厂模式的优势

---

<div align="center">

[⬆ 返回教程目录](../README.md) | [← 上一节](01-uploader-interface.md) | [下一节 →](03-uploader-factory.md)

</div>
