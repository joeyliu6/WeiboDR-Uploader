# 类型系统设计

## 学习目标

通过本节学习，你将能够：
- ✅ 理解 TypeScript 类型系统的作用和价值
- ✅ 掌握项目中的核心类型定义
- ✅ 了解如何设计可扩展的类型系统
- ✅ 学会使用联合类型和泛型
- ✅ 理解类型安全如何防止错误

## 前置知识

- 熟悉 TypeScript 基础语法
- 了解 interface 和 type 的区别
- 理解泛型的基本概念

---

## 为什么需要类型系统？

### 问题：JavaScript 的类型困境

JavaScript 是动态类型语言，容易出现类型错误：

```javascript
// ❌ JavaScript：运行时才发现错误
function uploadImage(config) {
  console.log(config.cookie);  // 如果 config 是 undefined 怎么办？
}

uploadImage();  // 运行时报错：Cannot read property 'cookie' of undefined
```

---

### 解决方案：TypeScript 类型系统

```typescript
// ✅ TypeScript：编译时就发现错误
interface WeiboConfig {
  cookie: string;
}

function uploadImage(config: WeiboConfig) {
  console.log(config.cookie);  // 类型安全
}

uploadImage();  // ❌ 编译错误：Expected 1 arguments, but got 0
uploadImage({ cookie: 'abc' });  // ✅ 正确
```

**优势**：
- ✅ **编译时检查** - 错误在编写代码时就被发现
- ✅ **智能提示** - IDE 自动补全和提示
- ✅ **代码文档** - 类型本身就是最好的文档
- ✅ **重构安全** - 修改接口后，所有使用该接口的地方都会报错

---

## 项目的类型系统架构

**文件位置**：[src/config/types.ts](../../src/config/types.ts) (437 行)

```
types.ts
├── ServiceType (联合类型)                  ← 支持的图床列表
├── BaseServiceConfig (基础接口)            ← 所有配置的基类
├── 各图床配置接口
│   ├── WeiboServiceConfig                 ← 微博配置
│   ├── R2ServiceConfig                    ← R2 配置
│   ├── TCLServiceConfig                   ← TCL 配置
│   ├── JDServiceConfig                    ← 京东配置
│   ├── NowcoderServiceConfig              ← 牛客配置
│   ├── QiyuServiceConfig                  ← 七鱼配置
│   ├── ZhihuServiceConfig                 ← 知乎配置
│   └── NamiServiceConfig                  ← 纳米配置
├── UserConfig (用户配置)                   ← 完整的用户配置
├── HistoryItem (历史记录)                  ← 上传历史记录
└── DEFAULT_CONFIG (默认配置)              ← 默认值
```

---

## 1. ServiceType - 联合类型

### 定义

```typescript
/**
 * 支持的图床服务类型
 */
export type ServiceType =
  | 'weibo'      // 微博图床
  | 'r2'         // Cloudflare R2
  | 'jd'         // 京东图床
  | 'tcl'        // TCL 图床
  | 'nowcoder'   // 牛客图床
  | 'qiyu'       // 七鱼图床
  | 'zhihu'      // 知乎图床
  | 'nami';      // 纳米图床
```

---

### 为什么使用联合类型？

**方式 1：使用字符串（不推荐）**
```typescript
// ❌ 没有类型检查
let serviceId: string = 'weibo';
serviceId = 'unknownService';  // 没有错误！运行时才发现
```

**方式 2：使用联合类型（推荐）**
```typescript
// ✅ 类型安全
let serviceId: ServiceType = 'weibo';
serviceId = 'unknownService';  // ❌ 编译错误！
//          ~~~~~~~~~~~~~~~~
// Type '"unknownService"' is not assignable to type 'ServiceType'
```

---

### 联合类型的优势

✅ **智能提示**
```typescript
function uploadTo(service: ServiceType) {
  // IDE 会自动提示 8 个可选值
  switch (service) {
    case 'weibo': // 自动补全
    case 'r2':
    case 'tcl':
    // ...
  }
}
```

✅ **穷举检查**
```typescript
function getServiceName(service: ServiceType): string {
  switch (service) {
    case 'weibo': return '微博图床';
    case 'r2': return 'Cloudflare R2';
    case 'tcl': return 'TCL 图床';
    // ❌ 如果漏掉某个 case，TypeScript 会警告
  }
}
```

✅ **类型窄化**
```typescript
if (serviceId === 'weibo') {
  // TypeScript 知道这里 serviceId 一定是 'weibo'
  const config = userConfig.services.weibo;  // 类型安全
}
```

---

## 2. BaseServiceConfig - 基础配置接口

### 定义

```typescript
/**
 * 基础服务配置接口
 * 所有图床配置的公共字段
 */
export interface BaseServiceConfig {
  /** 服务是否启用 */
  enabled: boolean;
}
```

---

### 为什么需要基础接口？

**继承复用**：所有图床配置都包含 `enabled` 字段

```typescript
export interface WeiboServiceConfig extends BaseServiceConfig {
  cookie: string;  // 微博特有的字段
}

export interface R2ServiceConfig extends BaseServiceConfig {
  accountId: string;         // R2 特有的字段
  accessKeyId: string;
  secretAccessKey: string;
  // ...
}
```

**使用示例**：
```typescript
const weiboConfig: WeiboServiceConfig = {
  enabled: true,     // 继承自 BaseServiceConfig
  cookie: 'abc123'   // 微博特有
};

const r2Config: R2ServiceConfig = {
  enabled: false,    // 继承自 BaseServiceConfig
  accountId: '...',  // R2 特有
  accessKeyId: '...',
  // ...
};
```

---

## 3. 各图床配置接口

### WeiboServiceConfig - 微博配置

```typescript
/**
 * 微博服务配置
 */
export interface WeiboServiceConfig extends BaseServiceConfig {
  /** 微博 Cookie（必填） */
  cookie: string;
}
```

**使用示例**：
```typescript
const weiboConfig: WeiboServiceConfig = {
  enabled: true,
  cookie: 'SUB=abc123; SUBP=xyz789'
};

// ❌ 编译错误：缺少 cookie
const invalidConfig: WeiboServiceConfig = {
  enabled: true
};
```

---

### R2ServiceConfig - Cloudflare R2 配置

```typescript
/**
 * Cloudflare R2 服务配置
 */
export interface R2ServiceConfig extends BaseServiceConfig {
  /** 账户 ID */
  accountId: string;

  /** 访问密钥 ID */
  accessKeyId: string;

  /** 访问密钥 */
  secretAccessKey: string;

  /** 存储桶名称 */
  bucketName: string;

  /** 存储路径前缀 (如 'images/') */
  path: string;

  /** 公开访问域名 (如 'https://cdn.example.com') */
  publicDomain: string;
}
```

**字段说明**：

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `accountId` | string | Cloudflare 账户 ID | `abc123def456` |
| `accessKeyId` | string | API 密钥 ID | `AKI...` |
| `secretAccessKey` | string | API 密钥 | `sk_...` |
| `bucketName` | string | 存储桶名称 | `my-images` |
| `path` | string | 存储路径前缀 | `uploads/` 或 空字符串 |
| `publicDomain` | string | 公开访问域名 | `https://cdn.example.com` |

---

### TCLServiceConfig 和 JDServiceConfig - 零配置图床

```typescript
/**
 * TCL 图床服务配置
 * TCL 图床无需认证，开箱即用
 */
export interface TCLServiceConfig extends BaseServiceConfig {
  // 无需额外配置字段
}

/**
 * 京东图床服务配置
 * 京东图床无需认证，开箱即用
 */
export interface JDServiceConfig extends BaseServiceConfig {
  // 无需额外配置字段
}
```

**为什么也定义接口？**
- 保持一致性：所有图床都有配置接口
- 便于扩展：将来可能添加配置项
- 类型安全：UserConfig.services 的类型定义需要

---

### NamiServiceConfig - 纳米图床配置

```typescript
/**
 * 纳米图床服务配置
 * 需要 Cookie 和 Auth-Token 认证
 */
export interface NamiServiceConfig extends BaseServiceConfig {
  /** 纳米 Cookie（完整的 Cookie 字符串） */
  cookie: string;

  /** Auth-Token（从 Cookie 中提取的 JWT Token） */
  authToken: string;
}
```

**特殊设计**：
- `cookie` - 完整的 Cookie 字符串
- `authToken` - 从 Cookie 中提取的 JWT Token（后端需要）

---

## 4. UserConfig - 用户配置（核心！）

### 完整定义

```typescript
/**
 * 用户配置（新架构）
 * 支持多图床并行上传
 */
export interface UserConfig {
  /** 用户启用的图床服务列表（上传窗口勾选的图床） */
  enabledServices: ServiceType[];

  /** 全局可用的图床列表（设置中配置，控制上传界面显示哪些图床） */
  availableServices?: ServiceType[];

  /** 各图床服务的配置 */
  services: {
    weibo?: WeiboServiceConfig;
    r2?: R2ServiceConfig;
    jd?: JDServiceConfig;
    tcl?: TCLServiceConfig;
    nowcoder?: NowcoderServiceConfig;
    qiyu?: QiyuServiceConfig;
    zhihu?: ZhihuServiceConfig;
    nami?: NamiServiceConfig;
  };

  /** 输出格式 */
  outputFormat: OutputFormat;

  /** @deprecated 使用 linkPrefixConfig 代替，保留用于向后兼容 */
  baiduPrefix?: string;

  /** 链接前缀配置（用于微博图床代理） */
  linkPrefixConfig?: LinkPrefixConfig;

  /** WebDAV 配置（用于历史记录同步） */
  webdav?: WebDAVConfig;

  /** 浏览视图偏好设置 */
  galleryViewPreferences?: {
    viewMode: 'table' | 'grid';
    selectedImageBed?: ServiceType | 'all';
    gridColumnWidth: number;
  };
}
```

---

### 字段详解

#### enabledServices - 用户启用的图床

```typescript
enabledServices: ServiceType[];
```

**作用**：用户在上传窗口勾选的图床

**示例**：
```typescript
const config: UserConfig = {
  enabledServices: ['tcl', 'weibo', 'r2'],  // 用户勾选了 3 个图床
  // ...
};
```

---

#### services - 各图床的配置

```typescript
services: {
  weibo?: WeiboServiceConfig;
  r2?: R2ServiceConfig;
  // ...
};
```

**为什么使用可选字段（`?`）？**
- 用户可能只配置部分图床
- 未配置的图床字段为 `undefined`

**示例**：
```typescript
const config: UserConfig = {
  // ...
  services: {
    weibo: {
      enabled: true,
      cookie: 'SUB=...'
    },
    tcl: {
      enabled: true
    }
    // r2、jd 等未配置，为 undefined
  }
};
```

---

#### outputFormat - 输出格式

```typescript
export type OutputFormat = 'direct' | 'baidu-proxy';

outputFormat: OutputFormat;
```

**作用**：控制链接输出格式
- `direct` - 直接返回原始链接
- `baidu-proxy` - 使用百度代理前缀（仅微博）

---

#### linkPrefixConfig - 链接前缀配置

```typescript
export interface LinkPrefixConfig {
  /** 是否启用代理前缀 */
  enabled: boolean;

  /** 当前选中的前缀索引 */
  selectedIndex: number;

  /** 前缀列表 */
  prefixList: string[];
}
```

**示例**：
```typescript
linkPrefixConfig: {
  enabled: true,
  selectedIndex: 0,
  prefixList: [
    'https://image.baidu.com/search/down?thumburl=',
    'https://cdn.cdnjson.com/pic.html?url='
  ]
}
```

---

#### galleryViewPreferences - 视图偏好

```typescript
galleryViewPreferences?: {
  viewMode: 'table' | 'grid';           // 表格视图 or 网格视图
  selectedImageBed?: ServiceType | 'all'; // 筛选图床
  gridColumnWidth: number;               // 网格列宽
};
```

**示例**：
```typescript
galleryViewPreferences: {
  viewMode: 'grid',           // 网格视图
  selectedImageBed: 'tcl',    // 只显示 TCL 上传的图片
  gridColumnWidth: 200        // 列宽 200px
}
```

---

## 5. HistoryItem - 历史记录项

### 完整定义

```typescript
/**
 * 历史记录项（新架构）
 * 支持多图床并行上传结果
 */
export interface HistoryItem {
  /** 唯一标识符 */
  id: string;

  /** 上传时间戳 */
  timestamp: number;

  /** 原始本地文件名 */
  localFileName: string;

  /** 原始文件路径（用于重试上传） */
  filePath?: string;

  /** 主力图床（第一个上传成功的图床） */
  primaryService: ServiceType;

  /** 所有图床的上传结果 */
  results: Array<{
    /** 图床服务 ID */
    serviceId: ServiceType;

    /** 上传结果 */
    result?: UploadResult;

    /** 上传状态 */
    status: 'success' | 'failed';

    /** 错误信息（如果失败） */
    error?: string;
  }>;

  /** 最终生成的链接（基于主力图床） */
  generatedLink: string;
}
```

---

### 字段详解

#### id - 唯一标识符

```typescript
id: string;
```

**生成方式**：
```typescript
const historyItem: HistoryItem = {
  id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  // ...
};
```

---

#### results - 所有图床的上传结果

```typescript
results: Array<{
  serviceId: ServiceType;
  result?: UploadResult;
  status: 'success' | 'failed';
  error?: string;
}>;
```

**示例**：
```typescript
const historyItem: HistoryItem = {
  // ...
  results: [
    {
      serviceId: 'tcl',
      status: 'success',
      result: {
        serviceId: 'tcl',
        fileKey: 'https://...',
        url: 'https://...',
        size: 123456
      }
    },
    {
      serviceId: 'weibo',
      status: 'success',
      result: { /* ... */ }
    },
    {
      serviceId: 'r2',
      status: 'failed',
      error: 'CORS 错误'
    }
  ]
};
```

---

#### primaryService - 主力图床

```typescript
primaryService: ServiceType;
```

**作用**：标记第一个上传成功的图床

**示例**：
```typescript
{
  primaryService: 'tcl',  // TCL 是第一个成功的
  results: [
    { serviceId: 'tcl', status: 'success', /*...*/ },
    { serviceId: 'weibo', status: 'success', /*...*/ },  // 备份
    { serviceId: 'r2', status: 'failed', /*...*/ }
  ]
}
```

---

## 6. 类型安全的实际应用

### 示例 1：配置验证

```typescript
function validateWeiboConfig(config: WeiboServiceConfig): ValidationResult {
  // TypeScript 确保 config 一定有 cookie 字段
  if (!config.cookie || config.cookie.trim().length === 0) {
    return { valid: false, message: 'Cookie 不能为空' };
  }

  if (!config.cookie.includes('SUB=')) {
    return { valid: false, message: 'Cookie 格式不正确' };
  }

  return { valid: true };
}

// ✅ 类型安全
validateWeiboConfig({ enabled: true, cookie: 'SUB=...' });

// ❌ 编译错误：缺少 cookie
validateWeiboConfig({ enabled: true });
```

---

### 示例 2：类型窄化

```typescript
function getServiceConfig(
  serviceId: ServiceType,
  config: UserConfig
): BaseServiceConfig | undefined {
  switch (serviceId) {
    case 'weibo':
      return config.services.weibo;  // TypeScript 知道返回 WeiboServiceConfig
    case 'r2':
      return config.services.r2;     // TypeScript 知道返回 R2ServiceConfig
    case 'tcl':
      return config.services.tcl;    // TypeScript 知道返回 TCLServiceConfig
    // ...
  }
}
```

---

### 示例 3：联合类型的穷举检查

```typescript
function getServiceDisplayName(serviceId: ServiceType): string {
  switch (serviceId) {
    case 'weibo': return '微博图床';
    case 'r2': return 'Cloudflare R2';
    case 'tcl': return 'TCL 图床';
    case 'jd': return '京东图床';
    case 'nowcoder': return '牛客图床';
    case 'qiyu': return '七鱼图床';
    case 'zhihu': return '知乎图床';
    case 'nami': return '纳米图床';
    // ❌ 如果漏掉某个 case，TypeScript 会报错
  }

  // TypeScript 会警告：Function lacks ending return statement
}
```

---

## 7. DEFAULT_CONFIG - 默认配置

```typescript
export const DEFAULT_CONFIG: UserConfig = {
  enabledServices: ['tcl'],  // 默认启用 TCL（开箱即用）
  availableServices: ['weibo', 'r2', 'tcl', 'jd', 'nowcoder', 'qiyu', 'zhihu', 'nami'],
  services: {
    weibo: {
      enabled: true,
      cookie: ''
    },
    r2: {
      enabled: false,
      accountId: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucketName: '',
      path: '',
      publicDomain: ''
    },
    tcl: {
      enabled: true
    },
    jd: {
      enabled: true
    }
    // ...
  },
  outputFormat: 'direct',
  linkPrefixConfig: {
    enabled: false,
    selectedIndex: 0,
    prefixList: DEFAULT_PREFIXES
  },
  galleryViewPreferences: {
    viewMode: 'table',
    selectedImageBed: 'all',
    gridColumnWidth: 200
  }
};
```

---

## 类型系统设计原则

### 1. 使用接口而非类型别名（对于对象）

```typescript
// ✅ 推荐：使用 interface
export interface UserConfig {
  enabledServices: ServiceType[];
  services: { /* ... */ };
}

// ❌ 不推荐：使用 type（对于对象）
export type UserConfig = {
  enabledServices: ServiceType[];
  services: { /* ... */ };
};
```

**原因**：
- interface 可以扩展和合并
- interface 的错误提示更友好

---

### 2. 使用联合类型限制可选值

```typescript
// ✅ 推荐
type ServiceType = 'weibo' | 'r2' | 'tcl';

// ❌ 不推荐
type ServiceType = string;  // 失去了类型检查
```

---

### 3. 可选字段使用 `?` 而非 `| undefined`

```typescript
// ✅ 推荐
interface Config {
  cookie?: string;
}

// ❌ 不推荐
interface Config {
  cookie: string | undefined;
}
```

**区别**：
- `cookie?` - 字段可以不存在
- `cookie: string | undefined` - 字段必须存在，值可以是 undefined

---

### 4. 使用 readonly 防止意外修改

```typescript
interface IUploader {
  readonly serviceId: string;
  readonly serviceName: string;
  // ...
}

// ❌ 编译错误
const uploader: IUploader = getUploader();
uploader.serviceId = 'newId';  // Cannot assign to 'serviceId' because it is a read-only property
```

---

## 实战练习

### 练习 1：定义新图床的配置接口

**任务**：为一个需要 API Key 的新图床定义配置接口

**答案**：
```typescript
export interface NewServiceConfig extends BaseServiceConfig {
  /** API 密钥 */
  apiKey: string;

  /** API 端点（可选，有默认值） */
  endpoint?: string;
}
```

---

### 练习 2：类型安全的配置访问

**任务**：编写一个函数，安全地访问微博配置

```typescript
function getWeiboCookie(config: UserConfig): string | null {
  const weiboConfig = config.services.weibo;

  if (!weiboConfig || !weiboConfig.cookie) {
    return null;
  }

  return weiboConfig.cookie;
}
```

---

### 练习 3：联合类型穷举

**任务**：实现一个函数，根据 ServiceType 返回图标 Emoji

```typescript
function getServiceIcon(serviceId: ServiceType): string {
  switch (serviceId) {
    case 'weibo': return '🐦';
    case 'r2': return '☁️';
    case 'tcl': return '📺';
    case 'jd': return '🛒';
    case 'nowcoder': return '💻';
    case 'qiyu': return '🐟';
    case 'zhihu': return '📚';
    case 'nami': return '⚛️';
  }
}
```

---

## 下一步学习

### 已完成
- ✅ 理解 TypeScript 类型系统的价值
- ✅ 掌握项目核心类型定义
- ✅ 了解类型系统设计原则

### 接下来
1. [**04-event-driven.md**](./04-event-driven.md) - 事件驱动机制
   - Tauri 事件系统
   - 进度事件流程
   - 事件监听和发送

2. [**05-error-handling.md**](./05-error-handling.md) - 错误处理策略
   - 前端错误处理
   - Rust Result<T, E>
   - 错误传递机制

---

## 总结

通过本节，你已经：

✅ **理解了类型系统的价值** - 编译时检查、智能提示、代码文档
✅ **掌握了核心类型定义** - ServiceType、UserConfig、HistoryItem
✅ **学会了类型安全的编程** - 联合类型、接口继承、可选字段
✅ **了解了类型系统设计原则** - interface vs type、readonly、穷举检查

**关键要点**：
1. **ServiceType 联合类型** - 限制可选值，提供智能提示
2. **BaseServiceConfig 继承** - 复用公共字段
3. **UserConfig 核心配置** - 所有配置的集合
4. **HistoryItem 历史记录** - 支持多图床结果
5. **类型安全** - 让编译器帮你找错误

类型系统不是负担，而是**安全网**——它能在错误发生前就捕获它们！🛡️
