# PicNexus 自动化测试开发指南

本文档提供 PicNexus 项目自动化测试的完整实施指南，供项目开发完成后进行测试编写时参考。

## 目录

1. [技术选型](#技术选型)
2. [环境搭建](#环境搭建)
3. [目录结构](#目录结构)
4. [Mock 层实现](#mock-层实现)
5. [测试编写指南](#测试编写指南)
6. [运行测试](#运行测试)
7. [CI 集成](#ci-集成)
8. [最佳实践](#最佳实践)

---

## 技术选型

### 测试框架

| 类型 | 框架 | 版本 | 说明 |
|-----|------|------|------|
| 单元/组件测试 | Vitest | ^2.0.0 | 与 Vite 深度集成，速度快 |
| Vue 组件测试 | @vue/test-utils | ^2.4.0 | Vue 3 官方测试工具 |
| DOM 测试库 | @testing-library/vue | ^8.0.0 | 用户行为驱动测试 |
| DOM 环境 | happy-dom | ^14.0.0 | 轻量快速的 DOM 实现 |
| 覆盖率 | @vitest/coverage-v8 | ^2.0.0 | V8 原生覆盖率 |
| E2E 测试 | WebdriverIO | ^8.0.0 | Tauri 官方推荐 |

### 选型理由

1. **Vitest vs Jest**：Vitest 与 Vite 共享配置，无需额外 transform 配置，热更新支持更好
2. **happy-dom vs jsdom**：happy-dom 性能更优，启动更快
3. **WebdriverIO vs Playwright**：WebdriverIO 有官方 tauri-driver 支持

---

## 环境搭建

### 步骤 1: 安装依赖

```bash
npm install -D vitest @vue/test-utils @testing-library/vue @vitest/coverage-v8 @vitest/ui happy-dom
```

### 步骤 2: 创建 Vitest 配置

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    // 启用全局 API（describe, it, expect 等）
    globals: true,
    // 使用 happy-dom 作为 DOM 环境
    environment: 'happy-dom',
    // 全局 setup 文件
    setupFiles: ['./src/test/setup.ts'],
    // 测试文件匹配模式
    include: ['src/test/**/*.spec.ts'],
    // 排除 E2E 测试（单独运行）
    exclude: ['src/test/e2e/**', 'node_modules/**'],
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/composables/**',
        'src/core/**',
        'src/services/**',
        'src/uploaders/**',
        'src/utils/**'
      ],
      exclude: [
        'src/test/**',
        '**/*.d.ts',
        '**/types.ts'
      ],
      // 分阶段覆盖率目标
      thresholds: {
        // 第一阶段：核心模块 40%
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40
      }
    },
    // 超时设置（上传等异步操作需要更长时间）
    testTimeout: 10000,
    hookTimeout: 10000,
    // 并行运行
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
});
```

### 步骤 3: 添加 npm scripts

更新 `package.json`：

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### 步骤 4: 配置 TypeScript

创建 `tsconfig.test.json`（可选，用于测试专用配置）：

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals"]
  },
  "include": ["src/test/**/*"]
}
```

或直接在 `tsconfig.json` 中添加类型：

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

---

## 目录结构

```
src/test/
├── setup.ts                        # 全局配置和 Mock 初始化
├── mocks/                          # Mock 模块
│   ├── tauri/                      # Tauri API Mocks
│   │   ├── core.ts                 # invoke mock
│   │   ├── event.ts                # listen/emit mock
│   │   ├── path.ts                 # path API mock
│   │   ├── fs.ts                   # 文件系统 mock
│   │   ├── dialog.ts               # 对话框 mock
│   │   ├── clipboard.ts            # 剪贴板 mock
│   │   ├── sql.ts                  # SQLite mock（重点）
│   │   ├── http.ts                 # HTTP mock
│   │   └── index.ts                # 统一导出和初始化
│   ├── primevue.ts                 # PrimeVue 组件 mock
│   └── services/                   # 业务服务 mock
│       └── uploaders.ts            # 上传器 mock
│
├── fixtures/                       # 测试数据
│   ├── images/                     # 测试图片
│   │   └── test-image.jpg
│   ├── history.ts                  # 历史记录测试数据
│   ├── config.ts                   # 配置测试数据
│   └── upload.ts                   # 上传结果测试数据
│
├── factories/                      # 测试数据工厂
│   ├── historyFactory.ts           # 历史记录工厂
│   ├── configFactory.ts            # 配置工厂
│   └── uploadResultFactory.ts      # 上传结果工厂
│
├── utils/                          # 测试工具函数
│   ├── render.ts                   # 自定义 render 函数（集成 PrimeVue）
│   └── wait.ts                     # 异步等待工具
│
├── unit/                           # 单元测试
│   ├── utils/                      # 工具函数测试
│   │   ├── semaphore.spec.ts
│   │   ├── debounce.spec.ts
│   │   ├── cache.spec.ts
│   │   └── renameUtils.spec.ts
│   ├── uploaders/                  # 上传器测试
│   │   ├── UploaderFactory.spec.ts
│   │   ├── WeiboUploader.spec.ts
│   │   ├── R2Uploader.spec.ts
│   │   └── ...
│   ├── core/                       # 核心模块测试
│   │   ├── MultiServiceUploader.spec.ts
│   │   └── LinkGenerator.spec.ts
│   └── services/                   # 服务层测试
│       ├── HistoryDatabase.spec.ts
│       └── Store.spec.ts
│
├── composables/                    # Composables 测试
│   ├── useUpload.spec.ts
│   ├── useHistory.spec.ts
│   ├── useConfig.spec.ts
│   └── useThumbCache.spec.ts
│
├── components/                     # 组件测试
│   ├── UploadView.spec.ts
│   ├── HistoryView.spec.ts
│   └── UploadQueue.spec.ts
│
├── integration/                    # 集成测试
│   ├── upload-flow.spec.ts         # 完整上传流程
│   └── history-sync.spec.ts        # 历史记录同步
│
└── e2e/                            # E2E 测试（单独运行）
    ├── wdio.conf.ts                # WebdriverIO 配置
    ├── specs/
    │   ├── upload.e2e.ts
    │   └── history.e2e.ts
    └── fixtures/
```

---

## Mock 层实现

### 全局 Setup 文件

```typescript
// src/test/setup.ts
import { vi, beforeAll, afterEach, afterAll } from 'vitest';
import { config } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { setupTauriMocks, cleanupTauriMocks } from './mocks/tauri';

// 全局设置 Tauri Mocks
beforeAll(() => {
  setupTauriMocks();
});

// 每个测试后清理
afterEach(() => {
  vi.clearAllMocks();
});

// 全部测试完成后清理
afterAll(() => {
  cleanupTauriMocks();
});

// 配置 Vue Test Utils 全局插件
config.global.plugins = [PrimeVue];

// Mock window.crypto（用于 UUID 生成）
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  }
});

// Mock matchMedia（某些 PrimeVue 组件需要）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));
```

### Tauri Core Mock (invoke)

```typescript
// src/test/mocks/tauri/core.ts
import { vi } from 'vitest';

// 命令处理器映射
type InvokeHandler = (args: any) => Promise<any>;
const invokeHandlers = new Map<string, InvokeHandler>();

// Mock invoke 函数
export const mockInvoke = vi.fn(async (cmd: string, args?: any) => {
  const handler = invokeHandlers.get(cmd);
  if (handler) {
    return handler(args);
  }
  // 默认返回 null，而不是抛出错误（更宽松的 mock）
  console.warn(`[Mock] 未配置的 Tauri 命令: ${cmd}`);
  return null;
});

// 注册命令处理器
export function registerInvokeHandler(cmd: string, handler: InvokeHandler) {
  invokeHandlers.set(cmd, handler);
}

// 移除命令处理器
export function removeInvokeHandler(cmd: string) {
  invokeHandlers.delete(cmd);
}

// 清理所有处理器
export function clearInvokeHandlers() {
  invokeHandlers.clear();
  mockInvoke.mockClear();
}

// 预配置常用命令的默认处理器
export function setupDefaultInvokeHandlers() {
  // 图片元数据获取
  registerInvokeHandler('get_image_metadata', async ({ filePath }) => ({
    width: 1920,
    height: 1080,
    aspect_ratio: 1.78,
    file_size: 1024000,
    format: 'jpeg'
  }));

  // 微博上传
  registerInvokeHandler('upload_file_stream', async ({ filePath, weiboCookie }) => ({
    pid: `test_pid_${Date.now()}`,
    width: 1920,
    height: 1080,
    size: 1024000
  }));

  // 微博连接测试
  registerInvokeHandler('test_weibo_connection', async ({ weiboCookie }) => {
    if (!weiboCookie || weiboCookie.trim().length === 0) {
      throw new Error('Cookie 不能为空');
    }
    return '连接成功';
  });

  // Chrome 检测
  registerInvokeHandler('check_chrome_installed', async () => true);

  // 文件读取（Base64）
  registerInvokeHandler('read_file_base64', async ({ path }) => {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  });
}
```

### Tauri Event Mock

```typescript
// src/test/mocks/tauri/event.ts
import { vi } from 'vitest';

type EventCallback = (event: { payload: any }) => void;
const eventListeners = new Map<string, Set<EventCallback>>();

// Mock listen
export const mockListen = vi.fn(async (event: string, handler: EventCallback) => {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(handler);

  // 返回取消监听函数
  return () => {
    eventListeners.get(event)?.delete(handler);
  };
});

// Mock emit
export const mockEmit = vi.fn(async (event: string, payload?: any) => {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(handler => handler({ payload }));
  }
});

// 测试辅助：手动触发事件
export function triggerEvent(event: string, payload: any) {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(handler => handler({ payload }));
  }
}

// 测试辅助：检查事件监听器数量
export function getListenerCount(event: string): number {
  return eventListeners.get(event)?.size ?? 0;
}

// 清理
export function clearEventListeners() {
  eventListeners.clear();
  mockListen.mockClear();
  mockEmit.mockClear();
}
```

### SQLite Mock（重点改进）

使用内存存储模拟 SQLite，支持更复杂的查询：

```typescript
// src/test/mocks/tauri/sql.ts
import { vi } from 'vitest';

// 内存数据库存储
interface TableData {
  [tableName: string]: any[];
}

const databases = new Map<string, TableData>();

// Mock Database 类
export class MockDatabase {
  private dbPath: string;
  private tables: TableData;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
    if (!databases.has(dbPath)) {
      databases.set(dbPath, {});
    }
    this.tables = databases.get(dbPath)!;
  }

  static async load(path: string): Promise<MockDatabase> {
    return new MockDatabase(path);
  }

  async execute(sql: string, params?: any[]): Promise<{ rowsAffected: number; lastInsertId: number }> {
    const upperSQL = sql.toUpperCase().trim();

    // CREATE TABLE
    if (upperSQL.startsWith('CREATE TABLE')) {
      const tableMatch = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }
      }
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    // INSERT
    if (upperSQL.startsWith('INSERT')) {
      const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
      if (tableMatch && params) {
        const tableName = tableMatch[1];
        if (!this.tables[tableName]) {
          this.tables[tableName] = [];
        }
        // 解析列名
        const columnsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
        if (columnsMatch) {
          const columns = columnsMatch[1].split(',').map(c => c.trim());
          const record: any = {};
          columns.forEach((col, i) => {
            record[col] = params[i];
          });
          this.tables[tableName].push(record);
          return { rowsAffected: 1, lastInsertId: this.tables[tableName].length };
        }
      }
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    // UPDATE
    if (upperSQL.startsWith('UPDATE')) {
      const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
      if (tableMatch && params) {
        const tableName = tableMatch[1];
        const data = this.tables[tableName] || [];
        // 简化实现：假设 WHERE 条件是 id = ?
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch) {
          const whereCol = whereMatch[1];
          const whereVal = params[params.length - 1];
          let affected = 0;
          data.forEach(item => {
            if (item[whereCol] === whereVal) {
              // 更新其他字段
              const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
              if (setMatch) {
                const setParts = setMatch[1].split(',');
                setParts.forEach((part, i) => {
                  const colMatch = part.match(/(\w+)\s*=/);
                  if (colMatch) {
                    item[colMatch[1].trim()] = params[i];
                  }
                });
              }
              affected++;
            }
          });
          return { rowsAffected: affected, lastInsertId: 0 };
        }
      }
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    // DELETE
    if (upperSQL.startsWith('DELETE')) {
      const tableMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const data = this.tables[tableName] || [];
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params) {
          const whereCol = whereMatch[1];
          const whereVal = params[0];
          const before = data.length;
          this.tables[tableName] = data.filter(item => item[whereCol] !== whereVal);
          return { rowsAffected: before - this.tables[tableName].length, lastInsertId: 0 };
        }
        // DELETE ALL
        const count = data.length;
        this.tables[tableName] = [];
        return { rowsAffected: count, lastInsertId: 0 };
      }
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    // CREATE INDEX (忽略)
    if (upperSQL.startsWith('CREATE INDEX') || upperSQL.startsWith('CREATE UNIQUE INDEX')) {
      return { rowsAffected: 0, lastInsertId: 0 };
    }

    return { rowsAffected: 0, lastInsertId: 0 };
  }

  async select<T>(sql: string, params?: any[]): Promise<T[]> {
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return [] as T[];

    const tableName = tableMatch[1];
    let data = [...(this.tables[tableName] || [])];

    // WHERE 条件处理
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i);
    if (whereMatch && params && params.length > 0) {
      const whereClause = whereMatch[1];

      // 简单的 = 条件
      const eqMatch = whereClause.match(/(\w+)\s*=\s*\?/g);
      if (eqMatch) {
        let paramIndex = 0;
        eqMatch.forEach(match => {
          const colMatch = match.match(/(\w+)\s*=/);
          if (colMatch && paramIndex < params.length) {
            const col = colMatch[1];
            const val = params[paramIndex++];
            data = data.filter(item => item[col] === val);
          }
        });
      }

      // LIKE 条件
      const likeMatch = whereClause.match(/(\w+)\s+LIKE\s+\?/i);
      if (likeMatch && params.length > 0) {
        const col = likeMatch[1];
        const pattern = params[0].replace(/%/g, '');
        data = data.filter(item =>
          item[col] && String(item[col]).toLowerCase().includes(pattern.toLowerCase())
        );
      }
    }

    // ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const orderCol = orderMatch[1];
      const orderDir = (orderMatch[2] || 'ASC').toUpperCase();
      data.sort((a, b) => {
        if (a[orderCol] < b[orderCol]) return orderDir === 'ASC' ? -1 : 1;
        if (a[orderCol] > b[orderCol]) return orderDir === 'ASC' ? 1 : -1;
        return 0;
      });
    }

    // LIMIT 和 OFFSET
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    if (limitMatch || offsetMatch) {
      const limit = limitMatch ? parseInt(limitMatch[1]) : data.length;
      const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
      data = data.slice(offset, offset + limit);
    }

    // COUNT(*)
    if (sql.toUpperCase().includes('COUNT(*)')) {
      return [{ count: data.length }] as T[];
    }

    return data as T[];
  }

  async close(): Promise<void> {
    // 不做任何事
  }
}

// 测试辅助函数
export function clearMockDatabase(dbPath?: string) {
  if (dbPath) {
    databases.delete(dbPath);
  } else {
    databases.clear();
  }
}

export function seedMockDatabase(dbPath: string, tableName: string, data: any[]) {
  if (!databases.has(dbPath)) {
    databases.set(dbPath, {});
  }
  databases.get(dbPath)![tableName] = [...data];
}

export function getMockDatabaseData(dbPath: string, tableName: string): any[] {
  return databases.get(dbPath)?.[tableName] || [];
}

export default MockDatabase;
```

### Tauri Mock 统一入口

```typescript
// src/test/mocks/tauri/index.ts
import { vi } from 'vitest';
import { mockInvoke, setupDefaultInvokeHandlers, clearInvokeHandlers } from './core';
import { mockListen, mockEmit, clearEventListeners } from './event';
import MockDatabase, { clearMockDatabase } from './sql';

export function setupTauriMocks() {
  // Mock @tauri-apps/api/core
  vi.mock('@tauri-apps/api/core', () => ({
    invoke: mockInvoke
  }));

  // Mock @tauri-apps/api/event
  vi.mock('@tauri-apps/api/event', () => ({
    listen: mockListen,
    emit: mockEmit
  }));

  // Mock @tauri-apps/api/path
  vi.mock('@tauri-apps/api/path', () => ({
    basename: vi.fn(async (path: string) => path.split(/[/\\]/).pop() || path),
    dirname: vi.fn(async (path: string) => path.split(/[/\\]/).slice(0, -1).join('/') || '/'),
    appDataDir: vi.fn(async () => '/mock/app/data'),
    appLocalDataDir: vi.fn(async () => '/mock/app/local'),
    join: vi.fn(async (...paths: string[]) => paths.join('/'))
  }));

  // Mock @tauri-apps/plugin-fs
  vi.mock('@tauri-apps/plugin-fs', () => ({
    readTextFile: vi.fn(async () => '{}'),
    writeTextFile: vi.fn(async () => {}),
    readFile: vi.fn(async () => new Uint8Array([0x89, 0x50, 0x4E, 0x47])), // PNG magic bytes
    writeFile: vi.fn(async () => {}),
    exists: vi.fn(async () => true),
    mkdir: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    readDir: vi.fn(async () => [])
  }));

  // Mock @tauri-apps/plugin-dialog
  vi.mock('@tauri-apps/plugin-dialog', () => ({
    open: vi.fn(async () => ['/mock/path/image.jpg']),
    save: vi.fn(async () => '/mock/path/export.json'),
    message: vi.fn(async () => {}),
    ask: vi.fn(async () => true),
    confirm: vi.fn(async () => true)
  }));

  // Mock @tauri-apps/plugin-clipboard-manager
  vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
    writeText: vi.fn(async () => {}),
    readText: vi.fn(async () => ''),
    writeImage: vi.fn(async () => {}),
    readImage: vi.fn(async () => new Uint8Array([]))
  }));

  // Mock @tauri-apps/plugin-sql
  vi.mock('@tauri-apps/plugin-sql', () => ({
    default: MockDatabase
  }));

  // Mock @tauri-apps/plugin-http
  vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn(async (url: string, options?: any) => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
      arrayBuffer: async () => new ArrayBuffer(0)
    }))
  }));

  // Mock @tauri-apps/plugin-notification
  vi.mock('@tauri-apps/plugin-notification', () => ({
    sendNotification: vi.fn(async () => {}),
    requestPermission: vi.fn(async () => 'granted'),
    isPermissionGranted: vi.fn(async () => true)
  }));

  // Mock @tauri-apps/plugin-shell
  vi.mock('@tauri-apps/plugin-shell', () => ({
    open: vi.fn(async () => {}),
    Command: vi.fn().mockImplementation(() => ({
      execute: vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }))
    }))
  }));

  // Mock @tauri-apps/api/webview
  vi.mock('@tauri-apps/api/webview', () => ({
    getCurrentWebview: vi.fn(() => ({
      onDragDropEvent: vi.fn(async (handler: any) => {
        return () => {}; // 返回取消监听函数
      })
    }))
  }));

  // Mock @tauri-apps/api/webviewWindow
  vi.mock('@tauri-apps/api/webviewWindow', () => ({
    WebviewWindow: vi.fn().mockImplementation(() => ({
      once: vi.fn(),
      listen: vi.fn(async () => () => {}),
      emit: vi.fn(async () => {})
    })),
    getCurrentWebviewWindow: vi.fn(() => ({
      listen: vi.fn(async () => () => {}),
      emit: vi.fn(async () => {})
    }))
  }));

  // 设置默认 invoke 处理器
  setupDefaultInvokeHandlers();
}

export function cleanupTauriMocks() {
  clearInvokeHandlers();
  clearEventListeners();
  clearMockDatabase();
}

// 重新导出
export * from './core';
export * from './event';
export { MockDatabase, clearMockDatabase, seedMockDatabase, getMockDatabaseData } from './sql';
```

---

## 测试数据工厂

### 历史记录工厂

```typescript
// src/test/factories/historyFactory.ts
import type { HistoryItem, UploadResult } from '@/config/types';

let idCounter = 0;

// 创建单个历史记录
export function createHistoryItem(overrides?: Partial<HistoryItem>): HistoryItem {
  const id = `test-history-${++idCounter}`;
  return {
    id,
    timestamp: Date.now() - idCounter * 1000, // 每条记录时间递减
    localFileName: `test-image-${idCounter}.jpg`,
    localFilePath: `/mock/path/test-image-${idCounter}.jpg`,
    primaryService: 'weibo',
    results: [createUploadResult()],
    generatedLink: `https://example.com/image-${idCounter}.jpg`,
    linkFormat: 'url',
    ...overrides
  };
}

// 创建上传结果
export function createUploadResult(overrides?: Partial<UploadResult>): UploadResult {
  return {
    serviceId: 'weibo',
    url: `https://tvax1.sinaimg.cn/large/test_pid_${Date.now()}.jpg`,
    fileKey: `test_pid_${Date.now()}`,
    success: true,
    ...overrides
  };
}

// 批量创建历史记录
export function createHistoryItems(count: number, overrides?: Partial<HistoryItem>): HistoryItem[] {
  return Array.from({ length: count }, () => createHistoryItem(overrides));
}

// 重置计数器（在 beforeEach 中调用）
export function resetHistoryFactory() {
  idCounter = 0;
}
```

### 配置工厂

```typescript
// src/test/factories/configFactory.ts
import type { AppConfig, ServiceConfig } from '@/config/types';

// 创建默认应用配置
export function createAppConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    theme: 'system',
    language: 'zh-CN',
    autoStart: false,
    minimizeToTray: true,
    defaultLinkFormat: 'markdown',
    selectedServices: ['weibo'],
    ...overrides
  };
}

// 创建微博服务配置
export function createWeiboConfig(overrides?: Partial<ServiceConfig>): ServiceConfig {
  return {
    enabled: true,
    cookie: 'test_weibo_cookie_string',
    ...overrides
  };
}

// 创建 R2 服务配置
export function createR2Config(overrides?: Partial<any>): any {
  return {
    enabled: true,
    accountId: 'test_account_id',
    accessKeyId: 'test_access_key',
    secretAccessKey: 'test_secret_key',
    bucketName: 'test-bucket',
    customDomain: 'https://cdn.example.com',
    ...overrides
  };
}
```

---

## 测试编写指南

### 单元测试示例

#### 工具函数测试

```typescript
// src/test/unit/utils/semaphore.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Semaphore, chunkArray } from '@/utils/semaphore';

describe('Semaphore', () => {
  let semaphore: Semaphore;

  beforeEach(() => {
    semaphore = new Semaphore(2);
  });

  it('应该正确初始化许可数', () => {
    expect(semaphore.available).toBe(2);
  });

  it('获取许可后应该减少可用数', async () => {
    await semaphore.acquire();
    expect(semaphore.available).toBe(1);
  });

  it('释放许可后应该增加可用数', async () => {
    await semaphore.acquire();
    semaphore.release();
    expect(semaphore.available).toBe(2);
  });

  it('超过许可数时应该等待', async () => {
    await semaphore.acquire();
    await semaphore.acquire();

    let acquired = false;
    const acquirePromise = semaphore.acquire().then(() => {
      acquired = true;
    });

    // 立即检查，应该还没获取到
    expect(acquired).toBe(false);

    // 释放一个许可
    semaphore.release();
    await acquirePromise;

    // 现在应该获取到了
    expect(acquired).toBe(true);
  });

  it('withPermit 应该自动管理许可', async () => {
    const result = await semaphore.withPermit(async () => {
      expect(semaphore.available).toBe(1);
      return 'done';
    });

    expect(result).toBe('done');
    expect(semaphore.available).toBe(2);
  });

  it('withPermit 在异常时也应该释放许可', async () => {
    await expect(
      semaphore.withPermit(async () => {
        throw new Error('测试错误');
      })
    ).rejects.toThrow('测试错误');

    expect(semaphore.available).toBe(2);
  });
});

describe('chunkArray', () => {
  it('应该正确分割数组', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(chunkArray(arr, 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('空数组应该返回空数组', () => {
    expect(chunkArray([], 2)).toEqual([]);
  });

  it('chunkSize 大于数组长度时返回单个 chunk', () => {
    expect(chunkArray([1, 2], 5)).toEqual([[1, 2]]);
  });
});
```

#### 服务层测试

```typescript
// src/test/unit/services/HistoryDatabase.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearMockDatabase, seedMockDatabase, getMockDatabaseData } from '../../mocks/tauri';
import { createHistoryItem, createHistoryItems, resetHistoryFactory } from '../../factories/historyFactory';

// 注意：需要动态导入，因为模块加载时会初始化数据库
let historyDB: any;

describe('HistoryDatabase', () => {
  beforeEach(async () => {
    resetHistoryFactory();
    clearMockDatabase();
    // 动态导入以确保 mock 生效
    const module = await import('@/services/HistoryDatabase');
    historyDB = module.historyDB;
    await historyDB.open();
  });

  afterEach(async () => {
    await historyDB.close();
    clearMockDatabase();
  });

  describe('insert', () => {
    it('应该成功插入记录', async () => {
      const item = createHistoryItem();
      await historyDB.insert(item);

      const data = getMockDatabaseData('sqlite:history.db', 'history');
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(item.id);
    });

    it('应该正确序列化 results 数组', async () => {
      const item = createHistoryItem({
        results: [
          { serviceId: 'weibo', url: 'https://example.com/1.jpg', success: true },
          { serviceId: 'github', url: 'https://example.com/2.jpg', success: true }
        ]
      });

      await historyDB.insert(item);
      const retrieved = await historyDB.getById(item.id);

      expect(retrieved.results).toHaveLength(2);
      expect(retrieved.results[0].serviceId).toBe('weibo');
    });
  });

  describe('getPage', () => {
    it('应该正确分页返回数据', async () => {
      // 预填充 10 条记录
      const items = createHistoryItems(10);
      seedMockDatabase('sqlite:history.db', 'history', items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        local_file_name: item.localFileName
      })));

      const result = await historyDB.getPage({ page: 1, pageSize: 3 });

      expect(result.items.length).toBe(3);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
    });

    it('最后一页 hasMore 应该为 false', async () => {
      const items = createHistoryItems(5);
      seedMockDatabase('sqlite:history.db', 'history', items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        local_file_name: item.localFileName
      })));

      const result = await historyDB.getPage({ page: 2, pageSize: 3 });

      expect(result.items.length).toBe(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('delete', () => {
    it('应该删除指定记录', async () => {
      const item = createHistoryItem();
      seedMockDatabase('sqlite:history.db', 'history', [{
        id: item.id,
        timestamp: item.timestamp,
        local_file_name: item.localFileName
      }]);

      await historyDB.delete(item.id);

      const data = getMockDatabaseData('sqlite:history.db', 'history');
      expect(data.length).toBe(0);
    });
  });
});
```

### Composables 测试

```typescript
// src/test/composables/useHistory.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearMockDatabase, seedMockDatabase } from '../mocks/tauri';
import { createHistoryItems, resetHistoryFactory } from '../factories/historyFactory';

describe('useHistoryManager', () => {
  let useHistoryManager: any;
  let invalidateCache: any;

  beforeEach(async () => {
    resetHistoryFactory();
    clearMockDatabase();

    // 动态导入
    const module = await import('@/composables/useHistory');
    useHistoryManager = module.useHistoryManager;
    invalidateCache = module.invalidateCache;

    // 清理缓存
    invalidateCache();
  });

  describe('loadHistory', () => {
    it('应该加载历史记录到响应式状态', async () => {
      const items = createHistoryItems(5);
      seedMockDatabase('sqlite:history.db', 'history', items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        local_file_name: item.localFileName,
        results: JSON.stringify(item.results)
      })));

      const manager = useHistoryManager();
      await manager.loadHistory();

      expect(manager.allHistoryItems.value.length).toBe(5);
      expect(manager.isDataLoaded.value).toBe(true);
    });

    it('缓存有效时应该跳过数据库查询', async () => {
      const manager = useHistoryManager();
      await manager.loadHistory();

      const firstItems = manager.allHistoryItems.value;
      await manager.loadHistory(); // 第二次调用

      // 应该是同一个引用（使用缓存）
      expect(manager.allHistoryItems.value).toBe(firstItems);
    });

    it('forceReload 应该强制刷新', async () => {
      const manager = useHistoryManager();
      await manager.loadHistory();

      // 添加新数据
      seedMockDatabase('sqlite:history.db', 'history', [{
        id: 'new-item',
        timestamp: Date.now(),
        local_file_name: 'new.jpg'
      }]);

      await manager.loadHistory(true); // 强制刷新

      expect(manager.allHistoryItems.value.some((item: any) => item.id === 'new-item')).toBe(true);
    });
  });

  describe('deleteHistoryItem', () => {
    it('应该删除记录并更新状态', async () => {
      const items = createHistoryItems(3);
      seedMockDatabase('sqlite:history.db', 'history', items.map(item => ({
        id: item.id,
        timestamp: item.timestamp,
        local_file_name: item.localFileName
      })));

      const manager = useHistoryManager();
      await manager.loadHistory();

      const idToDelete = items[0].id;
      await manager.deleteHistoryItem(idToDelete);

      expect(manager.allHistoryItems.value.find((i: any) => i.id === idToDelete)).toBeUndefined();
    });
  });
});
```

### 组件测试

```typescript
// src/test/components/UploadView.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setupTauriMocks, cleanupTauriMocks } from '../mocks/tauri';
import PrimeVue from 'primevue/config';

// 组件需要在 mock 设置后导入
let UploadView: any;

describe('UploadView', () => {
  beforeEach(async () => {
    setupTauriMocks();
    // 动态导入组件
    const module = await import('@/components/views/UploadView.vue');
    UploadView = module.default;
  });

  afterEach(() => {
    cleanupTauriMocks();
  });

  const mountComponent = (options = {}) => {
    return mount(UploadView, {
      global: {
        plugins: [PrimeVue],
        stubs: {
          // 存根复杂子组件
          UploadQueue: true,
          Teleport: true
        }
      },
      ...options
    });
  };

  it('应该渲染上传区域', () => {
    const wrapper = mountComponent();

    // 检查关键元素存在
    expect(wrapper.find('.upload-area').exists() || wrapper.find('[data-testid="upload-area"]').exists()).toBe(true);
  });

  it('拖拽文件应该触发上传', async () => {
    const wrapper = mountComponent();

    // 模拟拖拽事件
    const dropZone = wrapper.find('.drop-zone');
    if (dropZone.exists()) {
      await dropZone.trigger('drop', {
        dataTransfer: {
          files: [new File([''], 'test.jpg', { type: 'image/jpeg' })]
        }
      });

      await flushPromises();
      // 验证上传流程被触发
    }
  });
});
```

---

## 运行测试

### 常用命令

```bash
# 开发模式（监视文件变化）
npm test

# 单次运行所有测试
npm run test:run

# 打开可视化界面
npm run test:ui

# 生成覆盖率报告
npm run test:coverage

# 只运行特定测试文件
npm test -- src/test/unit/utils/semaphore.spec.ts

# 只运行匹配的测试
npm test -- -t "Semaphore"

# 运行特定目录的测试
npm test -- src/test/composables/
```

### 调试测试

在 VS Code 中调试测试，添加 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test File",
      "autoAttachChildProcesses": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "smartStep": true,
      "console": "integratedTerminal"
    }
  ]
}
```

---

## CI 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        if: always()
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false

  # E2E 测试（可选，需要更复杂的设置）
  # e2e:
  #   runs-on: ubuntu-latest
  #   needs: test
  #   steps:
  #     - uses: actions/checkout@v4
  #     - name: Setup Tauri dependencies
  #       run: |
  #         sudo apt-get update
  #         sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev
  #     - run: npm ci
  #     - run: npm run build
  #     - run: npm run test:e2e
```

---

## 最佳实践

### 1. 测试命名规范

```typescript
describe('模块/组件名', () => {
  describe('方法名/功能', () => {
    it('应该 + 预期行为', () => {});
    it('当 + 条件 + 应该 + 行为', () => {});
  });
});

// 示例
describe('HistoryDatabase', () => {
  describe('insert', () => {
    it('应该成功插入记录', () => {});
    it('当记录已存在时应该抛出错误', () => {});
  });
});
```

### 2. 测试隔离

```typescript
// 每个测试后重置状态
beforeEach(() => {
  resetHistoryFactory();
  clearMockDatabase();
});

// 避免测试之间共享状态
// ❌ 错误
let sharedData: any[];
beforeAll(() => { sharedData = []; });

// ✅ 正确
beforeEach(() => { const data = []; });
```

### 3. 异步测试

```typescript
// 使用 async/await
it('应该异步加载数据', async () => {
  await manager.loadData();
  expect(manager.data.value).toHaveLength(10);
});

// 等待 Vue 更新
import { flushPromises } from '@vue/test-utils';
it('应该更新视图', async () => {
  wrapper.vm.count++;
  await flushPromises();
  expect(wrapper.text()).toContain('1');
});
```

### 4. Mock 使用原则

```typescript
// 只 mock 外部依赖，不 mock 被测模块
// ❌ 错误：mock 了被测试的函数
vi.mock('@/utils/semaphore');

// ✅ 正确：只 mock 外部依赖
vi.mock('@tauri-apps/api/core');
```

### 5. 覆盖率目标

| 阶段 | 行覆盖率 | 函数覆盖率 | 分支覆盖率 |
|-----|---------|----------|----------|
| 第一阶段 | 40% | 40% | 30% |
| 第二阶段 | 60% | 60% | 50% |
| 第三阶段 | 80% | 80% | 70% |

优先保证核心模块的覆盖率：
1. `src/services/HistoryDatabase.ts`
2. `src/composables/useUpload.ts`
3. `src/composables/useHistory.ts`
4. `src/core/MultiServiceUploader.ts`

---

## 测试优先级建议

项目开发完成后，建议按以下顺序编写测试：

### 优先级 1：核心逻辑（必须）

| 模块 | 文件 | 原因 |
|-----|------|------|
| 工具函数 | `semaphore.ts`, `cache.ts` | 纯函数，最容易测试 |
| 数据库服务 | `HistoryDatabase.ts` | 数据持久化核心 |
| 配置存储 | `store.ts` | 配置读写核心 |

### 优先级 2：业务逻辑（重要）

| 模块 | 文件 | 原因 |
|-----|------|------|
| 上传器 | `uploaders/*.ts` | 核心业务功能 |
| 多服务协调 | `MultiServiceUploader.ts` | 复杂业务逻辑 |
| Composables | `useUpload.ts`, `useHistory.ts` | 状态管理核心 |

### 优先级 3：UI 层（可选）

| 模块 | 文件 | 原因 |
|-----|------|------|
| 关键视图 | `UploadView.vue`, `HistoryView.vue` | 用户交互入口 |
| 集成测试 | `upload-flow.spec.ts` | 端到端验证 |

---

## 常见问题

### Q: 测试运行时报 "Cannot find module '@tauri-apps/api/core'"

A: 确保 `setupTauriMocks()` 在测试文件导入被测模块之前调用。使用动态导入：

```typescript
beforeEach(async () => {
  setupTauriMocks();
  const module = await import('@/services/HistoryDatabase');
  historyDB = module.historyDB;
});
```

### Q: PrimeVue 组件报错

A: 在 setup.ts 中配置全局插件：

```typescript
import { config } from '@vue/test-utils';
import PrimeVue from 'primevue/config';

config.global.plugins = [PrimeVue];
```

### Q: 异步测试超时

A: 增加超时时间或检查是否有未等待的 Promise：

```typescript
it('长时间操作', async () => {
  // ...
}, 30000); // 30 秒超时
```

### Q: 覆盖率报告不准确

A: 确保 coverage.include 配置正确，且排除了测试文件和类型文件。

---

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils 文档](https://test-utils.vuejs.org/)
- [Testing Library 文档](https://testing-library.com/docs/vue-testing-library/intro)
- [Tauri E2E 测试指南](https://tauri.app/v2/develop/tests/)
