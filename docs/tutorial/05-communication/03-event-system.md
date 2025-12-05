# 5.3 事件监听系统详解

## 学习目标

- 掌握 `listen()` 和 `emit()` 的使用
- 理解事件监听器的生命周期
- 学会防止内存泄漏
- 了解事件负载设计

---

## 1. 事件监听基础

### 1.1 前端监听事件

```typescript
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// 监听事件
const unlisten: UnlistenFn = await listen('upload://progress', (event) => {
  console.log('收到进度事件:', event.payload);
});

// 稍后清理监听器
unlisten();
```

### 1.2 Rust 端发送事件

```rust
#[tauri::command]
async fn upload_file(window: Window, id: String) -> Result<(), String> {
    // 发送事件
    window.emit("upload://progress", serde_json::json!({
        "id": id,
        "progress": 50,
        "total": 100
    }))?;

    Ok(())
}
```

---

## 2. 事件负载设计

### 2.1 定义 Payload 接口

```typescript
// 前端
interface ProgressEvent {
  id: string;
  progress: number;
  total: number;
}

const unlisten = await listen<ProgressEvent>('upload://progress', (event) => {
  const { id, progress, total } = event.payload;
  const percent = Math.round((progress / total) * 100);
  console.log(`${id}: ${percent}%`);
});
```

```rust
// Rust
#[derive(Clone, serde::Serialize)]
struct ProgressEvent {
    id: String,
    progress: u64,
    total: u64,
}

window.emit("upload://progress", ProgressEvent {
    id: upload_id,
    progress: bytes_sent,
    total: file_size,
})?;
```

---

## 3. 监听器生命周期管理

### 3.1 在 try-finally 中清理

```typescript
async function upload(filePath: string) {
  let unlisten: UnlistenFn | null = null;

  try {
    // 注册监听器
    unlisten = await listen('upload://progress', handleProgress);

    // 执行上传
    await invoke('upload_file', { filePath });
  } finally {
    // 确保清理（即使发生错误）
    if (unlisten) {
      unlisten();
    }
  }
}
```

### 3.2 Vue 组件中清理

```vue
<script setup lang="ts">
import { onUnmounted } from 'vue';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

let unlisten: UnlistenFn | null = null;

// 组件挂载时注册监听器
unlisten = await listen('cookie-updated', (event) => {
  console.log('Cookie 更新:', event.payload);
});

// 组件卸载时清理
onUnmounted(() => {
  if (unlisten) {
    unlisten();
  }
});
</script>
```

---

## 4. 事件过滤

### 4.1 基于 ID 过滤

```typescript
const uploadId = 'upload-123';

const unlisten = await listen('upload://progress', (event) => {
  const payload = event.payload as ProgressEvent;

  // 只处理当前上传任务的事件
  if (payload.id === uploadId) {
    onProgress(payload.progress / payload.total * 100);
  }
});
```

### 4.2 使用命名空间

```typescript
// 为每个上传任务创建专属事件名
const eventName = `upload://progress/${uploadId}`;

const unlisten = await listen(eventName, (event) => {
  // 自动过滤，只接收当前任务的事件
  onProgress(event.payload.percent);
});
```

---

## 5. 常见错误和解决方案

### 5.1 内存泄漏

```typescript
// ❌ 错误：没有清理监听器
async function upload() {
  await listen('progress', handleProgress); // 内存泄漏！
  await invoke('upload');
}

// ✅ 正确：使用 finally 清理
async function upload() {
  let unlisten: UnlistenFn | null = null;
  try {
    unlisten = await listen('progress', handleProgress);
    await invoke('upload');
  } finally {
    if (unlisten) unlisten();
  }
}
```

### 5.2 事件名拼写错误

```typescript
// ❌ Rust: emit("upload-progress", ...)
// ❌ 前端: listen("upload://progress", ...)
// 事件名不一致！

// ✅ 使用常量统一管理
const EVENT_UPLOAD_PROGRESS = 'upload://progress';

// Rust
window.emit(EVENT_UPLOAD_PROGRESS, ...)?;

// 前端
listen(EVENT_UPLOAD_PROGRESS, ...);
```

---

## 总结

- ✅ `listen()` 返回清理函数，必须调用避免内存泄漏
- ✅ 使用泛型 `listen<T>` 获得类型安全
- ✅ 在 `finally` 块或 `onUnmounted` 中清理监听器
- ✅ 使用 ID 或命名空间过滤事件
- ✅ 事件名统一使用常量管理

👉 [下一节：5.4 进度跟踪实现](./04-progress-tracking.md)
