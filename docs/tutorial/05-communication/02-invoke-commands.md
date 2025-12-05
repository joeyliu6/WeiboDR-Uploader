# 5.2 invoke 调用详解

## 学习目标

- 掌握 `invoke()` 的使用方法和参数传递
- 理解 Promise 的异步处理
- 学会错误捕获和处理
- 了解性能优化技巧

---

## 1. invoke 基础用法

### 1.1 简单调用

```typescript
import { invoke } from '@tauri-apps/api/tauri';

// 调用 Rust 命令（无参数）
const result = await invoke('hello_world');
console.log(result); // "Hello from Rust!"
```

### 1.2 带参数调用

```typescript
// 调用 Rust 命令（有参数）
const result = await invoke('upload_to_tcl', {
  id: 'upload-123',
  filePath: 'C:\\Users\\xxx\\image.jpg'
});

console.log(result); // {url: "https://...", size: 102400}
```

**关键点**：
- 参数必须是对象形式 `{key: value}`
- 参数名必须与 Rust 函数参数名一致（camelCase）

---

## 2. 类型安全的 invoke

### 2.1 定义返回类型

```typescript
interface TCLUploadResult {
  url: string;
  size: number;
}

const result = await invoke<TCLUploadResult>('upload_to_tcl', {
  id: uploadId,
  filePath: path
});

// TypeScript 知道 result 的类型
console.log(result.url);  // ✓ 类型安全
console.log(result.size); // ✓ 类型安全
```

---

## 3. 错误处理

### 3.1 try-catch 模式

```typescript
try {
  const result = await invoke('upload_to_tcl', { id, filePath });
  console.log('上传成功:', result.url);
} catch (error) {
  console.error('上传失败:', error);
  // 显示用户友好的错误提示
  showNotification(`上传失败: ${error}`);
}
```

### 3.2 Promise.catch() 模式

```typescript
invoke('upload_to_tcl', { id, filePath })
  .then(result => {
    console.log('上传成功:', result.url);
  })
  .catch(error => {
    console.error('上传失败:', error);
  });
```

---

## 4. 并发调用

### 4.1 Promise.all（全部成功才成功）

```typescript
const [result1, result2, result3] = await Promise.all([
  invoke('upload_to_tcl', { id: '1', filePath: path1 }),
  invoke('upload_to_weibo', { id: '2', filePath: path2 }),
  invoke('upload_to_r2', { id: '3', filePath: path3 })
]);

// 所有上传都成功才继续
```

### 4.2 Promise.allSettled（部分失败也继续）

```typescript
const results = await Promise.allSettled([
  invoke('upload_to_tcl', { id: '1', filePath: path }),
  invoke('upload_to_weibo', { id: '2', filePath: path }),
  invoke('upload_to_r2', { id: '3', filePath: path })
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`图床${index + 1}上传成功:`, result.value);
  } else {
    console.error(`图床${index + 1}上传失败:`, result.reason);
  }
});
```

---

## 5. 实战案例

### 5.1 BaseUploader 中的 invoke 调用

```typescript
protected async uploadViaRust(
  filePath: string,
  params: Record<string, any>,
  onProgress?: ProgressCallback
): Promise<any> {
  const uploadId = this.generateUniqueId();

  // 设置进度监听
  const unlisten = await listen(`upload://progress/${uploadId}`, (event) => {
    onProgress?.(event.payload.percent);
  });

  try {
    // 调用 Rust 命令
    const result = await invoke(this.getRustCommand(), {
      id: uploadId,
      filePath,
      ...params  // 展开额外参数
    });

    return result;
  } finally {
    unlisten();  // 确保清理监听器
  }
}
```

---

## 总结

- ✅ `invoke()` 是前端调用 Rust 的唯一方式
- ✅ 返回 Promise，支持 async/await 和 .then/.catch
- ✅ 参数必须是对象，使用泛型指定返回类型
- ✅ 使用 try-catch 或 .catch() 处理错误
- ✅ Promise.allSettled 支持并发调用

👉 [下一节：5.3 事件监听系统](./03-event-system.md)
