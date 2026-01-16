# PicNexus 弹窗通知系统优化方案

> 基于 [toast-notification-report.md](./toast-notification-report.md) 分析结果

## 1. 优化目标

1. **减少通知疲劳** - 降低非必要通知频率
2. **统一用户体验** - 一致的文案和交互
3. **提升信息价值** - 通知内容更有意义
4. **增强可维护性** - 集中管理，便于修改

---

## 2. 架构优化

### 2.1 创建通知常量文件

**文件**: `src/constants/toastMessages.ts`

```typescript
// src/constants/toastMessages.ts
// 集中管理所有通知文案，便于维护和国际化

export const TOAST_MESSAGES = {
  // === 通用操作 ===
  common: {
    copySuccess: (count?: number) => ({
      summary: '已复制',
      detail: count ? `${count} 个链接已复制到剪贴板` : '链接已复制到剪贴板',
      life: 1500
    }),
    copyFailed: (error: string) => ({
      summary: '复制失败',
      detail: error
    }),
    deleteSuccess: (count: number) => ({
      summary: '已删除',
      detail: `${count} 条记录`
    }),
    deleteFailed: (error: string) => ({
      summary: '删除失败',
      detail: error
    }),
    noSelection: {
      summary: '未选择',
      detail: '请先选择要操作的项目'
    },
    noData: {
      summary: '暂无数据',
      detail: '没有可操作的数据'
    }
  },

  // === 配置相关 ===
  config: {
    saveSuccess: {
      summary: '已保存',
      detail: '配置已保存'
    },
    saveFailed: (error: string) => ({
      summary: '保存失败',
      detail: error
    }),
    loadFailed: (error: string) => ({
      summary: '加载失败',
      detail: error,
      fallback: '已使用默认配置'
    }),
    validationFailed: (message: string) => ({
      summary: '验证失败',
      detail: message
    })
  },

  // === 上传相关 ===
  upload: {
    retrying: (fileName: string, current: number, max: number) => ({
      summary: '正在重试',
      detail: `${fileName} (${current}/${max})`
    }),
    retrySuccess: (serviceName: string) => ({
      summary: '已修复',
      detail: `${serviceName} 上传成功`
    }),
    retryFailed: (serviceName: string, error: string) => ({
      summary: '重试失败',
      detail: `${serviceName}: ${error}`
    }),
    partialFailed: (fileName: string, failedServices: string) => ({
      summary: '部分失败',
      detail: `${fileName}: ${failedServices}`
    }),
    networkError: {
      summary: '网络异常',
      detail: '请检查网络连接后重试'
    },
    noService: {
      summary: '未选择图床',
      detail: '请选择至少一个图床服务'
    }
  },

  // === 同步相关 ===
  sync: {
    uploadSuccess: (type: 'config' | 'history', count?: number) => ({
      summary: '已上传',
      detail: type === 'config' ? '配置已同步到云端' : `${count} 条记录已上传`
    }),
    downloadSuccess: (type: 'config' | 'history', count?: number) => ({
      summary: '已下载',
      detail: type === 'config' ? '配置已从云端恢复' : `${count} 条记录已下载`
    }),
    syncFailed: (error: string) => ({
      summary: '同步失败',
      detail: error
    }),
    noWebDAV: {
      summary: '未配置',
      detail: '请先配置 WebDAV 连接'
    }
  },

  // === 网络状态 ===
  network: {
    disconnected: {
      summary: '网络断开',
      detail: '请检查网络连接'
    },
    restored: {
      summary: '网络恢复',
      detail: '可以继续操作'
    }
  },

  // === 认证相关 ===
  auth: {
    success: (serviceName: string) => ({
      summary: '验证成功',
      detail: `${serviceName} 连接正常`
    }),
    failed: (serviceName: string, error?: string) => ({
      summary: '验证失败',
      detail: error || `${serviceName} 连接失败`
    }),
    expired: (serviceName: string) => ({
      summary: '授权过期',
      detail: `${serviceName} 需要重新登录`
    }),
    cookieUpdated: (serviceName: string) => ({
      summary: 'Cookie 已更新',
      detail: `${serviceName} Cookie 已自动填充`
    })
  }
} as const;
```

### 2.2 增强 useToast

**文件**: `src/composables/useToast.ts`

```typescript
// 新增：智能通知策略
interface ToastOptions {
  /** 是否合并同类通知 */
  merge?: boolean;
  /** 合并窗口时间 */
  mergeWindow?: number;
  /** 静默模式（不显示但记录日志） */
  silent?: boolean;
  /** 优先级（高优先级会打断低优先级） */
  priority?: 'low' | 'normal' | 'high';
}

// 新增：批量操作进度通知
interface ProgressToast {
  update: (current: number, total: number) => void;
  complete: (message: string) => void;
  fail: (error: string) => void;
}

export function useToast() {
  const toast = usePrimeToast();

  // ... 现有方法 ...

  /**
   * 创建进度通知（用于批量操作）
   */
  const progress = (summary: string): ProgressToast => {
    let toastId: string | null = null;

    return {
      update(current: number, total: number) {
        // 更新进度显示
      },
      complete(message: string) {
        // 转换为成功通知
      },
      fail(error: string) {
        // 转换为错误通知
      }
    };
  };

  /**
   * 静默执行（仅记录日志，不显示通知）
   */
  const silentSuccess = (summary: string, detail?: string) => {
    console.log(`[Toast][静默] ✓ ${summary}: ${detail || ''}`);
  };

  return {
    success,
    error,
    warn,
    info,
    show,
    clear,
    progress,      // 新增
    silentSuccess  // 新增
  };
}
```

---

## 3. 文案统一规范

### 3.1 标题（summary）规范

| 类型 | 推荐格式 | 示例 |
|------|----------|------|
| 成功 | 动作完成的被动态 | "已复制"、"已保存"、"已删除" |
| 失败 | "XX失败" | "复制失败"、"保存失败" |
| 警告 | 简短描述 | "未选择"、"暂无数据" |
| 信息 | 状态描述 | "正在重试"、"同步中" |

**反例**:
- ❌ "复制成功" → ✅ "已复制"
- ❌ "删除成功" → ✅ "已删除"
- ❌ "操作成功" → ✅ 具体动作

### 3.2 详情（detail）规范

- 提供有用的上下文信息
- 包含数量时使用模板字符串
- 错误信息要有指导性

**示例**:
```typescript
// ✅ 好的详情
`${count} 条记录已删除`
`${serviceName} 需要重新登录，请前往设置更新`
`文件格式不支持，支持：JPG, PNG, GIF, WEBP`

// ❌ 差的详情
`操作完成`
`error`
`失败`
```

### 3.3 时长规范

| 场景 | 推荐时长 | 说明 |
|------|----------|------|
| 快速反馈 | 1500ms | 复制成功等即时操作 |
| 一般成功 | 3000ms | 保存、删除等 |
| 警告 | 4000ms | 需要用户注意 |
| 一般错误 | 5000ms | 操作失败 |
| 重要错误 | 6000ms | 需要用户处理的错误 |
| 带操作提示 | 8000ms | 包含下一步指引 |

---

## 4. 具体优化建议

### 4.1 减少重复通知

#### 问题：配置保存多处显示

**当前代码** (`useConfig.ts`):
```typescript
// 第 134 行
toast.error('保存失败', errorMsg);
// 第 140 行
toast.error('保存失败', errorMsg);  // 外层 catch 再次显示
```

**优化方案**:
```typescript
async function saveConfig(newConfig: UserConfig, silent = false): Promise<void> {
  try {
    // ... 保存逻辑
    if (!silent) toast.success('已保存');
  } catch (error) {
    // 只在最外层显示一次
    if (!silent) toast.error('保存失败', getErrorMessage(error));
    throw error; // 允许调用方处理，但不重复显示
  }
}
```

### 4.2 减少不必要通知

#### 时间线跳转成功

**当前代码** (`TimelineView.vue:334`):
```typescript
toast.success('已跳转', `${year}年${month + 1}月`);
```

**优化建议**: 移除此通知，跳转本身就是视觉反馈

#### 主题切换

**当前代码** (`SettingsView.vue:269`):
```typescript
toast.success('已切换', `当前主题：${mode === 'light' ? '亮色' : '深色'}`);
```

**优化建议**: 移除此通知，界面变化就是反馈

### 4.3 合并同类通知

#### 批量操作进度

**当前**: 批量重传时只显示开始和结束

**优化**: 使用进度通知
```typescript
const progress = toast.progress('批量重传');

for (const item of items) {
  progress.update(current, total);
  await retryItem(item);
}

progress.complete(`${successCount} 个成功`);
```

### 4.4 增加有用通知

#### 可撤销操作

```typescript
// 删除操作增加撤销提示
toast.warn('已删除', '5秒内可撤销', {
  action: {
    label: '撤销',
    onClick: () => undoDelete(id)
  }
});
```

### 4.5 错误信息优化

#### 增加操作指引

**当前**:
```typescript
toast.error('网络请求失败', '请检查网络后重试');
```

**优化**:
```typescript
toast.error('网络异常', '请检查网络连接，或稀后重试', 6000);
```

#### 分级错误处理

```typescript
// 可恢复的错误 - warn
toast.warn('上传中断', '网络波动，将自动重试');

// 需要用户操作的错误 - error
toast.error('Cookie 过期', '请前往设置 > 微博 更新 Cookie', 8000);

// 致命错误 - error + 更长时间
toast.error('数据库损坏', '请联系技术支持或尝试重装应用', 10000);
```

---

## 5. 实施计划

### 阶段 1：基础设施（低风险）

1. 创建 `src/constants/toastMessages.ts`
2. 增强 `useToast.ts` 添加新方法
3. 不修改现有调用

### 阶段 2：文案统一（中风险）

1. 逐个文件替换为常量引用
2. 统一"已X"格式
3. 调整时长

### 阶段 3：逻辑优化（需测试）

1. 移除重复的 toast 调用
2. 减少不必要通知
3. 添加进度通知

### 阶段 4：高级功能（可选）

1. 撤销操作支持
2. 通知历史记录
3. 用户偏好设置

---

## 6. 风险评估

| 优化项 | 风险等级 | 影响范围 | 测试重点 |
|--------|----------|----------|----------|
| 创建常量文件 | 低 | 无 | - |
| 增强 useToast | 低 | 无 | 新方法兼容性 |
| 替换文案 | 中 | 全局 | 用户感知 |
| 移除通知 | 中 | 特定功能 | 用户操作确认 |
| 合并逻辑 | 高 | 错误处理 | 边界情况 |

---

## 7. 度量指标

优化后应跟踪：

| 指标 | 目标 |
|------|------|
| 通知总数 | 减少 30% |
| 重复通知 | 降至 0 |
| 用户反馈 | 通知疲劳投诉减少 |
| 代码行数 | toastMessages.ts 集中管理 |

---

## 附录：优化清单

### 可立即移除的通知

- [ ] `TimelineView.vue:334` - 跳转成功
- [ ] `TimelineView.vue:352` - 年份跳转成功
- [ ] `SettingsView.vue:269` - 主题切换成功

### 需要合并的通知

- [ ] `useConfig.ts:134,140` - 保存失败（合并为一处）

### 需要统一文案的通知

- [ ] "复制成功" → "已复制"
- [ ] "删除成功" → "已删除"
- [ ] "导出成功" → "已导出"
- [ ] "连接成功" / "测试成功" / "认证成功" → "验证成功"
