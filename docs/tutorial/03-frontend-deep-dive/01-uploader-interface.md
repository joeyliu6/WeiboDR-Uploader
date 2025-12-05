# IUploader 接口详解

> 深入理解插件化架构的核心接口

---

## 📋 学习目标

完成本节学习后，你将能够：

- ✅ 完整理解 IUploader 接口的每个方法
- ✅ 掌握接口设计的原则和思想
- ✅ 理解为什么需要这个接口
- ✅ 能够根据接口设计新的上传器

---

## 前置知识

- TypeScript 接口（interface）基础
- async/await 异步编程
- Promise 的使用

---

## 1. 接口概览

### 1.1 为什么需要接口？

想象一个场景：

**没有接口的代码**：

```typescript
// 微博上传器
class WeiboUploader {
  async uploadToWeibo(file) { ... }
  validateWeiboConfig() { ... }
  getWeiboUrl() { ... }
}

// TCL 上传器
class TCLUploader {
  async uploadToTCL(file) { ... }
  checkTCLSettings() { ... }
  generateTCLLink() { ... }
}

// 调用方需要知道每个上传器的具体方法
if (service === 'weibo') {
  await weiboUploader.uploadToWeibo(file);
  url = weiboUploader.getWeiboUrl();
} else if (service === 'tcl') {
  await tclUploader.uploadToTCL(file);
  url = tclUploader.generateTCLLink();
}
// 每个上传器方法名不同，调用方很麻烦 ❌
```

**使用接口的代码**：

```typescript
// 所有上传器都实现同一个接口
interface IUploader {
  upload(file): Promise<Result>;
  getPublicUrl(result): string;
}

// 调用方不需要知道具体是哪个上传器
const uploader: IUploader = UploaderFactory.create(service);
const result = await uploader.upload(file);
const url = uploader.getPublicUrl(result);
// 统一的 API，简单清晰 ✅
```

**接口的作用**：

✅ **统一规范**：所有上传器有相同的方法签名
✅ **解耦**：调用方不依赖具体实现
✅ **类型安全**：TypeScript 强制实现所有方法
✅ **可扩展**：添加新上传器只需实现接口

---

### 1.2 IUploader 完整定义

**文件位置**：[c:\Users\Jiawei\Documents\GitHub\WeiboDR-Uploader\src\uploaders\base\IUploader.ts](../../src/uploaders/base/IUploader.ts)

```typescript
/**
 * 上传器接口
 * 所有图床上传器必须实现此接口
 */
export interface IUploader {
  /**
   * 图床服务唯一标识符
   * 示例: 'weibo', 'r2', 'tcl'
   */
  readonly serviceId: string;

  /**
   * 图床服务显示名称（用于 UI 显示）
   * 示例: '新浪微博', 'Cloudflare R2', 'TCL 图床'
   */
  readonly serviceName: string;

  /**
   * 验证配置完整性
   * @param config 图床特定的配置对象
   * @returns 验证结果，包含是否有效、错误信息
   */
  validateConfig(config: any): Promise<ValidationResult>;

  /**
   * 上传文件到图床
   * @param filePath 文件的绝对路径
   * @param options 上传选项（包含配置、超时、重试等）
   * @param onProgress 进度回调函数（可选），接收 0-100 的百分比
   * @returns 上传结果，包含 URL、文件标识、尺寸等信息
   */
  upload(
    filePath: string,
    options: UploadOptions,
    onProgress?: ProgressCallback
  ): Promise<UploadResult>;

  /**
   * 根据上传结果生成公开访问 URL
   * @param result 上传结果对象
   * @returns 可公开访问的 URL
   */
  getPublicUrl(result: UploadResult): string;

  /**
   * 测试与图床服务的连接性（可选方法）
   * @returns 测试结果，包含成功状态、延迟、错误信息
   */
  testConnection?(): Promise<ConnectionTestResult>;
}
```

---

## 2. 接口方法详解

### 2.1 serviceId 和 serviceName

#### serviceId（服务标识符）

**作用**：唯一标识一个图床服务

**特点**：
- `readonly`：不可修改（初始化后不能改变）
- 小写英文：便于在代码中使用
- 简短清晰：易于记忆和输入

**示例**：

```typescript
class WeiboUploader implements IUploader {
  readonly serviceId = 'weibo';  // ✅ 小写，简短
  // ❌ 错误示例：
  // readonly serviceId = '新浪微博';  // 使用中文
  // readonly serviceId = 'SinaWeibo'; // 使用大写
}
```

**用途**：

1. **工厂模式创建**：
```typescript
UploaderFactory.create('weibo');  // 通过 serviceId 创建上传器
```

2. **配置键**：
```typescript
const config = userConfig.services['weibo'];  // 使用 serviceId 获取配置
```

3. **历史记录**：
```typescript
const historyItem = {
  primaryService: 'weibo',  // 记录主力图床
  results: [
    { serviceId: 'weibo', status: 'success' },
    { serviceId: 'tcl', status: 'success' }
  ]
};
```

---

#### serviceName（服务显示名称）

**作用**：在 UI 中显示给用户的名称

**特点**：
- `readonly`：不可修改
- 用户友好：使用中文或常见名称
- 清晰明了：让用户一眼就知道是什么服务

**示例**：

```typescript
class WeiboUploader implements IUploader {
  readonly serviceId = 'weibo';
  readonly serviceName = '新浪微博';  // ✅ 中文，用户友好

  // ❌ 错误示例：
  // readonly serviceName = 'weibo';  // 太简短，用户不知道是什么
  // readonly serviceName = 'Sina Weibo Image Hosting Service';  // 太长
}
```

**用途**：

1. **UI 显示**：
```html
<div class="uploader-card">
  <h3>{{ uploader.serviceName }}</h3>  <!-- 显示"新浪微博" -->
</div>
```

2. **日志输出**：
```typescript
console.log(`[${this.serviceName}] 开始上传...`);
// 输出：[新浪微博] 开始上传...
```

3. **错误提示**：
```typescript
throw new Error(`${this.serviceName}上传失败: 网络错误`);
// 抛出：新浪微博上传失败: 网络错误
```

---

### 2.2 validateConfig()

#### 方法签名

```typescript
validateConfig(config: any): Promise<ValidationResult>
```

**参数**：
- `config`：图床特定的配置对象

**返回值**：
```typescript
interface ValidationResult {
  valid: boolean;        // 是否有效
  errors?: string[];     // 错误信息列表（如果无效）
  missingFields?: string[];  // 缺失的字段
}
```

---

#### 为什么需要配置验证？

**场景1：防止运行时错误**

```typescript
// ❌ 没有配置验证
async upload(filePath, options) {
  const cookie = options.config.cookie;  // undefined
  // 运行时错误：Cannot read property 'cookie' of undefined
}

// ✅ 有配置验证
async upload(filePath, options) {
  const validation = await this.validateConfig(options.config);
  if (!validation.valid) {
    throw new Error(`配置错误: ${validation.errors.join(', ')}`);
  }
  // 这里可以安全地访问 config.cookie
}
```

**场景2：提前发现问题**

```typescript
// 用户保存配置时立即验证
const validation = await uploader.validateConfig(newConfig);
if (!validation.valid) {
  alert(`配置错误：\n${validation.errors.join('\n')}`);
  // 不保存，让用户修正
} else {
  saveConfig(newConfig);  // 验证通过才保存
}
```

---

#### 实现示例

**简单验证（TCL 图床）**：

```typescript
async validateConfig(config: any): Promise<ValidationResult> {
  // TCL 图床无需配置，直接返回有效
  return { valid: true };
}
```

**复杂验证（微博图床）**：

```typescript
async validateConfig(config: any): Promise<ValidationResult> {
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 检查 Cookie 是否存在
  if (!config || !config.cookie) {
    missingFields.push('cookie');
    errors.push('请先配置微博 Cookie');
  }

  // 检查 Cookie 是否为空
  if (config?.cookie && config.cookie.trim().length === 0) {
    errors.push('Cookie 不能为空');
  }

  // 检查 Cookie 格式（必须包含 SUB 和 SUBP）
  if (config?.cookie) {
    if (!config.cookie.includes('SUB=') || !config.cookie.includes('SUBP=')) {
      errors.push('Cookie 格式不正确，必须包含 SUB 和 SUBP 字段');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}
```

**更复杂的验证（R2 图床）**：

```typescript
async validateConfig(config: any): Promise<ValidationResult> {
  const errors: string[] = [];
  const missingFields: string[] = [];

  // 定义必填字段
  const requiredFields = [
    'accountId',
    'accessKeyId',
    'secretAccessKey',
    'bucketName',
    'publicDomain'
  ];

  // 检查每个必填字段
  for (const field of requiredFields) {
    if (!config || !config[field] || config[field].trim().length === 0) {
      missingFields.push(field);
      errors.push(`请配置 ${field}`);
    }
  }

  // 验证 publicDomain 格式
  if (config?.publicDomain) {
    if (!config.publicDomain.startsWith('http://') &&
        !config.publicDomain.startsWith('https://')) {
      errors.push('公开域名必须以 http:// 或 https:// 开头');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    missingFields: missingFields.length > 0 ? missingFields : undefined
  };
}
```

---

### 2.3 upload()

#### 方法签名

```typescript
upload(
  filePath: string,
  options: UploadOptions,
  onProgress?: ProgressCallback
): Promise<UploadResult>
```

**参数**：

1. **filePath**：文件的绝对路径
```typescript
// 示例
filePath = 'C:\\Users\\User\\Pictures\\image.jpg'  // Windows
filePath = '/Users/user/Pictures/image.jpg'        // macOS/Linux
```

2. **options**：上传选项
```typescript
interface UploadOptions {
  config: any;           // 图床配置
  timeout?: number;      // 超时时间（毫秒）
  retries?: number;      // 重试次数
  metadata?: any;        // 额外元数据
}
```

3. **onProgress**（可选）：进度回调
```typescript
type ProgressCallback = (percent: number) => void;

// 使用示例
await uploader.upload(filePath, options, (percent) => {
  console.log(`上传进度：${percent}%`);
  // 更新进度条
});
```

**返回值**：

```typescript
interface UploadResult {
  serviceId: string;     // 图床标识
  fileKey: string;       // 文件唯一标识（如微博的 pid）
  url: string;           // 完整访问 URL
  size?: number;         // 文件大小（字节）
  metadata?: any;        // 额外元数据
}
```

---

#### 实现模式

大多数上传器都遵循这个模式：

```typescript
async upload(
  filePath: string,
  options: UploadOptions,
  onProgress?: ProgressCallback
): Promise<UploadResult> {

  // 1. 验证配置
  const validation = await this.validateConfig(options.config);
  if (!validation.valid) {
    throw new Error(`配置无效: ${validation.errors?.join(', ')}`);
  }

  // 2. 调用 Rust 后端上传
  try {
    const rustResult = await this.uploadViaRust(
      filePath,
      {
        // 传递给 Rust 的参数
        cookie: options.config.cookie,
        // ...其他参数
      },
      onProgress
    );

    // 3. 转换为标准 UploadResult
    return {
      serviceId: this.serviceId,
      fileKey: rustResult.pid || rustResult.id,
      url: this.buildUrl(rustResult),
      size: rustResult.size,
      metadata: { ...rustResult }
    };

  } catch (error) {
    // 4. 错误处理
    console.error(`[${this.serviceName}] 上传失败:`, error);
    throw new Error(`${this.serviceName}上传失败: ${error.message}`);
  }
}
```

---

#### TCL 上传器的 upload() 实现

完整示例：

```typescript
async upload(
  filePath: string,
  options: UploadOptions,
  onProgress?: ProgressCallback
): Promise<UploadResult> {

  this.log('info', '开始上传到 TCL', { filePath });

  try {
    // 调用基类的 Rust 上传方法
    // TCL 无需额外参数，传空对象
    const rustResult = await this.uploadViaRust(
      filePath,
      {},
      onProgress
    ) as TCLRustResult;

    this.log('info', 'TCL 上传成功', { url: rustResult.url });

    // 转换为标准 UploadResult
    return {
      serviceId: 'tcl',
      fileKey: rustResult.url,  // TCL 使用完整 URL 作为 fileKey
      url: rustResult.url,
      size: rustResult.size
    };

  } catch (error) {
    this.log('error', 'TCL 上传失败', error);
    throw new Error(`TCL 图床上传失败: ${error}`);
  }
}
```

---

### 2.4 getPublicUrl()

#### 方法签名

```typescript
getPublicUrl(result: UploadResult): string
```

**作用**：根据上传结果生成可公开访问的 URL

**为什么需要这个方法？**

有些图床的上传结果不是直接的 URL，需要拼接或转换：

**场景1：需要拼接域名**

```typescript
// 微博上传结果
const result = {
  serviceId: 'weibo',
  fileKey: '006xyz123abc',  // 只返回 pid
  url: ''  // 空的
};

// 需要拼接成完整 URL
getPublicUrl(result: UploadResult): string {
  return `https://tvax1.sinaimg.cn/large/${result.fileKey}.jpg`;
}
```

**场景2：需要添加代理前缀**

```typescript
// 微博原始链接
const originalUrl = 'https://tvax1.sinaimg.cn/large/006xyz.jpg';

// 添加百度代理前缀
getPublicUrl(result: UploadResult): string {
  const prefix = 'https://image.baidu.com/search/down?thumburl=';
  return prefix + result.url;
}
```

**场景3：需要选择不同尺寸**

```typescript
// 微博支持多种尺寸
getPublicUrl(result: UploadResult, size: 'large' | 'mw2000' = 'large'): string {
  return `https://tvax1.sinaimg.cn/${size}/${result.fileKey}.jpg`;
  // large: 原图
  // mw2000: 2000像素宽
  // small: 缩略图
}
```

---

#### 实现示例

**简单实现（TCL）**：

```typescript
getPublicUrl(result: UploadResult): string {
  // TCL 直接返回 URL，无需处理
  return result.url;
}
```

**复杂实现（微博）**：

```typescript
getPublicUrl(result: UploadResult): string {
  // 微博需要根据 fileKey 构建 URL
  const { fileKey } = result;

  // 构建基础 URL
  let url = `https://tvax1.sinaimg.cn/large/${fileKey}.jpg`;

  // 如果启用了代理前缀
  if (this.config.linkPrefixConfig?.enabled) {
    const prefix = this.config.linkPrefixConfig.selectedPrefix;
    url = prefix + url;
  }

  return url;
}
```

**高级实现（R2）**：

```typescript
getPublicUrl(result: UploadResult): string {
  // R2 需要拼接公开域名和路径
  const { publicDomain, path } = this.config;
  const { fileKey } = result;

  // 确保域名末尾没有斜杠
  const domain = publicDomain.replace(/\/$/, '');

  // 确保路径有斜杠
  const fullPath = path ? `/${path}/${fileKey}` : `/${fileKey}`;

  return `${domain}${fullPath}`;
  // 示例：https://cdn.example.com/images/2024/01/file.jpg
}
```

---

### 2.5 testConnection()（可选）

#### 方法签名

```typescript
testConnection?(): Promise<ConnectionTestResult>
```

**注意**：方法名后面有 `?`，表示这是可选方法，不是所有上传器都必须实现。

**返回值**：

```typescript
interface ConnectionTestResult {
  success: boolean;      // 是否连接成功
  latency?: number;      // 延迟（毫秒）
  message?: string;      // 提示信息
  error?: string;        // 错误信息（如果失败）
}
```

---

#### 为什么需要连接测试？

**场景1：验证配置正确性**

用户在设置页面填写配置后，点击"测试连接"按钮：

```typescript
// 用户填写配置
const newConfig = {
  accountId: 'xxx',
  accessKeyId: 'yyy',
  secretAccessKey: 'zzz',
  bucketName: 'my-bucket',
  publicDomain: 'https://cdn.example.com'
};

// 测试连接
const test = await uploader.testConnection?.();
if (test?.success) {
  alert('✓ 连接成功！配置正确');
  saveConfig(newConfig);
} else {
  alert(`✗ 连接失败：${test?.error}`);
  // 不保存，让用户检查配置
}
```

**场景2：诊断问题**

当上传失败时，可以先测试连接：

```typescript
const test = await uploader.testConnection?.();
if (!test?.success) {
  console.error('连接失败，可能原因：');
  console.error('- 网络问题');
  console.error('- API 密钥错误');
  console.error('- 服务不可用');
}
```

---

#### 实现示例

**简单实现（微博）**：

```typescript
async testConnection(): Promise<ConnectionTestResult> {
  try {
    const startTime = Date.now();

    // 发送一个简单的 API 请求
    const response = await fetch('https://m.weibo.cn/api/config', {
      headers: { Cookie: this.config.cookie }
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        latency,
        message: `连接成功，延迟 ${latency}ms`
      };
    } else {
      return {
        success: false,
        error: 'Cookie 可能已过期'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: `网络错误: ${error.message}`
    };
  }
}
```

**复杂实现（R2）**：

```typescript
async testConnection(): Promise<ConnectionTestResult> {
  try {
    const startTime = Date.now();

    // 调用 Rust 命令测试 R2 连接
    const result = await invoke('test_r2_connection', {
      accountId: this.config.accountId,
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      bucketName: this.config.bucketName
    });

    const latency = Date.now() - startTime;

    return {
      success: true,
      latency,
      message: `连接成功，存储桶可访问，延迟 ${latency}ms`
    };

  } catch (error) {
    // 解析错误类型
    if (error.includes('InvalidAccessKeyId')) {
      return {
        success: false,
        error: 'Access Key ID 错误，请检查配置'
      };
    } else if (error.includes('NoSuchBucket')) {
      return {
        success: false,
        error: '存储桶不存在，请检查 Bucket Name'
      };
    } else if (error.includes('CORS')) {
      return {
        success: false,
        error: 'CORS 未配置，请在 R2 控制台配置 CORS 规则'
      };
    } else {
      return {
        success: false,
        error: `连接失败: ${error}`
      };
    }
  }
}
```

---

## 3. 接口设计的原则

### 3.1 SOLID 原则

**S - Single Responsibility（单一职责）**：

✅ IUploader 只关注上传相关的操作
❌ 不包含 UI 逻辑、配置存储等

**I - Interface Segregation（接口隔离）**：

✅ testConnection 是可选的（不是所有上传器都需要）
✅ 接口方法最少且必要

**D - Dependency Inversion（依赖倒置）**：

✅ 调用方依赖接口，不依赖具体实现
```typescript
// ✅ 依赖接口
function uploadFile(uploader: IUploader, file: string) {
  return uploader.upload(file, {...});
}

// ❌ 依赖具体类
function uploadFile(uploader: WeiboUploader, file: string) {
  return uploader.upload(file, {...});
}
```

---

### 3.2 最少惊讶原则

**方法名清晰明了**：

✅ `upload()` - 一看就知道是上传
✅ `validateConfig()` - 一看就知道是验证配置
❌ `doUpload()` - do 是多余的
❌ `check()` - 太模糊，检查什么？

**参数顺序符合直觉**：

```typescript
// ✅ 主要参数在前，可选参数在后
upload(filePath, options, onProgress?)

// ❌ 可选参数在中间
upload(filePath, onProgress?, options)
```

---

## 4. 实战练习

### 练习1：设计一个新图床的接口

假设你要添加"阿里云 OSS"图床，请设计它的接口实现：

```typescript
class AliyunOSSUploader implements IUploader {
  // TODO: 实现所有接口方法

  // 提示：
  // 1. serviceId 用什么？'aliyun' 还是 'oss'？
  // 2. serviceName 用什么？'阿里云 OSS' 还是 '阿里云对象存储'？
  // 3. validateConfig 需要检查哪些字段？
  //    - accessKeyId?
  //    - accessKeySecret?
  //    - bucket?
  //    - region?
  // 4. getPublicUrl 需要如何拼接？
  //    - https://bucket.region.aliyuncs.com/path/file.jpg
}
```

### 练习2：实现 validateConfig

为微博图床实现完整的配置验证：

```typescript
async validateConfig(config: any): Promise<ValidationResult> {
  // TODO: 实现配置验证

  // 要求：
  // 1. 检查 Cookie 是否存在
  // 2. 检查 Cookie 是否包含 SUB 和 SUBP
  // 3. 检查 Cookie 长度是否合理（至少50个字符）
  // 4. 返回友好的错误提示
}
```

### 练习3：实现 getPublicUrl

为 R2 图床实现 URL 生成：

```typescript
getPublicUrl(result: UploadResult): string {
  // TODO: 实现 URL 生成

  // 已知：
  // - config.publicDomain = 'https://cdn.example.com'
  // - config.path = 'images'
  // - result.fileKey = '2024/01/photo.jpg'

  // 预期输出：
  // 'https://cdn.example.com/images/2024/01/photo.jpg'
}
```

---

## 5. 总结

### 🎯 本节要点

1. **接口的作用**：
   - 统一规范、解耦、类型安全、可扩展

2. **接口方法**：
   - `serviceId` 和 `serviceName`：标识和显示
   - `validateConfig()`：验证配置
   - `upload()`：上传文件
   - `getPublicUrl()`：生成 URL
   - `testConnection?()`：测试连接（可选）

3. **设计原则**：
   - 单一职责、接口隔离、依赖倒置
   - 最少惊讶原则

---

### 📝 检查清单

学完本节后，你应该能够：

- [ ] 解释为什么需要 IUploader 接口
- [ ] 说出接口的5个方法及其作用
- [ ] 实现一个简单的 validateConfig()
- [ ] 理解 upload() 的参数和返回值
- [ ] 知道何时需要实现 testConnection()

---

### 🚀 下一步

现在你已经理解了接口设计，接下来让我们学习抽象基类如何复用代码：

**[下一节：BaseUploader 抽象类 →](02-base-uploader.md)**

在下一节中，你将学习：
- BaseUploader 如何实现 IUploader
- uploadViaRust() 核心方法详解
- 辅助方法的作用
- 如何避免重复代码

---

<div align="center">

[⬆ 返回教程目录](../README.md) | [← 上一章](../../02-core-concepts/05-error-handling.md) | [下一节 →](02-base-uploader.md)

</div>
