# 第一次运行项目

## 学习目标

通过本节学习，你将能够：
- ✅ 成功克隆项目到本地
- ✅ 正确安装所有依赖
- ✅ 在开发模式下运行项目
- ✅ 使用 DevTools 查看控制台输出
- ✅ 测试基本的上传功能
- ✅ 解决常见的启动问题

## 前置知识

在开始之前，请确保：
- 已完成开发环境搭建（参见 [03-setup-dev-env.md](./03-setup-dev-env.md)）
- 熟悉基本的命令行操作
- 了解 Git 基础命令

---

## 步骤 1：克隆项目

### 1.1 选择存放位置

首先，选择一个合适的位置存放项目代码，例如：

**Windows:**
```bash
cd C:\Users\YourName\Documents\GitHub
```

**macOS/Linux:**
```bash
cd ~/projects
```

### 1.2 克隆项目

```bash
git clone https://github.com/your-username/WeiboDR-Uploader.git
cd WeiboDR-Uploader
```

**注意**：请将 `your-username` 替换为实际的 GitHub 用户名或组织名。

### 1.3 查看项目结构

克隆完成后，查看目录结构：

```bash
# Windows (使用 dir 或 tree)
dir

# macOS/Linux
ls -la
```

你应该看到以下主要目录和文件：
```
WeiboDR-Uploader/
├── src/                # 前端源码（Vue 3 + TypeScript）
├── src-tauri/          # 后端源码（Rust + Tauri）
├── docs/               # 文档目录
├── package.json        # Node.js 依赖配置
├── index.html          # 主窗口 HTML
├── vite.config.ts      # Vite 构建配置
└── README.md           # 项目说明
```

---

## 步骤 2：安装依赖

### 2.1 安装 Node.js 依赖

在项目根目录下运行：

```bash
npm install
```

**这一步会做什么？**
- 安装 Vue 3、TypeScript、Vite 等前端依赖
- 安装 Tauri CLI 工具
- 安装 AWS SDK（用于 R2 图床）
- 下载所有依赖到 `node_modules/` 目录

**预计时间**：1-3 分钟（取决于网络速度）

**输出示例**：
```
added 327 packages, and audited 328 packages in 2m

48 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### 2.2 验证依赖安装

检查 `package.json` 中的核心依赖是否正确安装：

```bash
# 查看已安装的包
npm list --depth=0
```

你应该看到：
```
weibodr-uploader@3.0.0
├── @aws-sdk/client-s3@3.490.0
├── @aws-sdk/lib-storage@3.937.0
├── @tauri-apps/api@1.5.3
├── @tauri-apps/cli@1.5.9
├── @vitejs/plugin-vue@6.0.2
├── @vueuse/core@14.0.0
├── typescript@5.3.3
├── vite@5.0.8
└── vue@3.5.24
```

### 2.3 Rust 依赖自动安装

当第一次运行 Tauri 时，Rust 依赖会自动安装，无需手动操作。

---

## 步骤 3：第一次运行开发模式

### 3.1 启动开发模式

在项目根目录下运行：

```bash
npm run tauri dev
```

**等价命令**（这两个命令完全相同）：
```bash
# 使用 npm script
npm run tauri dev

# 直接使用 Tauri CLI
npx tauri dev
```

### 3.2 第一次运行会发生什么？

**阶段 1：编译 Rust 后端（第一次较慢）**

你会看到类似的输出：
```
   Compiling proc-macro2 v1.0.70
   Compiling unicode-ident v1.0.12
   Compiling quote v1.0.33
   Compiling syn v2.0.39
   ...
   Compiling tauri v1.5.4
   Compiling weibodr-uploader v3.0.0
    Finished dev [unoptimized + debuginfo] target(s) in 2m 15s
```

**为什么第一次这么慢？**
- Rust 需要编译所有依赖库（包括 Tauri 框架本身）
- 第一次编译会生成约 2GB 的 `target/` 目录
- **后续运行会快很多**（通常 10-30 秒）

**阶段 2：启动 Vite 开发服务器**

```
  VITE v5.0.8  ready in 523 ms

  ➜  Local:   http://localhost:1420/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

**阶段 3：打开应用窗口**

几秒后，应用窗口会自动弹出，显示上传界面。

### 3.3 开发模式的特性

开发模式下，你会获得以下特性：

✅ **热重载（Hot Reload）**
- 修改前端代码后，浏览器自动刷新
- 无需手动重启应用
- 提高开发效率

✅ **DevTools 自动打开**
- 类似 Chrome 的开发者工具
- 查看控制台输出、网络请求、元素检查
- 调试 TypeScript 代码

✅ **详细的错误信息**
- 前端和后端的详细错误堆栈
- TypeScript 类型检查错误
- Rust 编译错误

---

## 步骤 4：使用 DevTools 查看控制台

### 4.1 打开 DevTools

如果 DevTools 没有自动打开，可以手动打开：

**方式 1：快捷键**
- Windows/Linux: `F12` 或 `Ctrl + Shift + I`
- macOS: `Cmd + Option + I`

**方式 2：应用菜单**
- 点击窗口右上角菜单 → "开发者工具"

### 4.2 查看启动日志

在 DevTools 的 **Console** 选项卡中，你应该看到类似的日志：

```javascript
[MultiServiceUploader] 初始化多图床上传器...
[UploaderFactory] 注册图床: weibo - 微博图床
[UploaderFactory] 注册图床: r2 - Cloudflare R2
[UploaderFactory] 注册图床: tcl - TCL图床
[UploaderFactory] 注册图床: jd - 京东图床
[UploaderFactory] 注册图床: nowcoder - 牛客图床
[Store] 配置加载成功
```

**这些日志说明了什么？**
1. **MultiServiceUploader 初始化** - 多图床编排器启动
2. **UploaderFactory 注册图床** - 5 个图床上传器已注册
3. **Store 配置加载** - 本地配置成功加载

### 4.3 检查关键对象

在 Console 中输入以下命令，检查核心对象：

```javascript
// 查看多图床上传器实例
window.multiServiceUploader

// 查看工厂管理的所有图床
window.UploaderFactory.getAllServices()

// 查看当前配置
await window.store.get('userConfig')
```

**预期输出**：
```javascript
// getAllServices() 的输出
[
  { serviceId: 'weibo', serviceName: '微博图床' },
  { serviceId: 'r2', serviceName: 'Cloudflare R2' },
  { serviceId: 'tcl', serviceName: 'TCL图床' },
  { serviceId: 'jd', serviceName: '京东图床' },
  { serviceId: 'nowcoder', serviceName: '牛客图床' }
]
```

---

## 步骤 5：测试基本上传功能

### 5.1 使用零配置图床（TCL 或京东）

**为什么选择 TCL/京东？**
- ✅ 无需任何配置
- ✅ 开箱即用
- ✅ 适合快速测试

### 5.2 上传测试图片

1. **准备测试图片**
   - 准备一张 JPG 或 PNG 图片（建议大小 < 5MB）
   - 例如：`test.jpg`

2. **勾选 TCL 图床**
   - 在应用界面中，勾选 **TCL图床** 复选框

3. **拖拽或选择图片**
   - 方式 1：直接拖拽图片到上传区域
   - 方式 2：点击上传区域，在文件对话框中选择图片

4. **观察上传进度**
   - 你会看到进度条从 0% → 100%
   - TCL 图床旁边显示 **✓ 成功**
   - 下方显示可复制的链接

### 5.3 查看上传日志

在 DevTools Console 中，你会看到详细的上传日志：

```javascript
[BaseUploader] 生成上传ID: upload_1234567890
[BaseUploader] 设置进度监听器: upload://progress/upload_1234567890
[TCLUploader] 调用 Rust 命令: upload_to_tcl
[Tauri IPC] 命令调用: upload_to_tcl { id: "upload_1234567890", filePath: "..." }
[Progress Event] upload_1234567890 - 上传中: 25%
[Progress Event] upload_1234567890 - 上传中: 50%
[Progress Event] upload_1234567890 - 上传中: 75%
[Progress Event] upload_1234567890 - 上传中: 100%
[TCLUploader] 上传成功: { serviceId: 'tcl', url: 'https://...' }
```

**日志解读**：
1. **生成唯一 uploadId** - 用于匹配进度事件
2. **设置进度监听器** - 监听 `upload://progress/upload_1234567890` 事件
3. **调用 Rust 命令** - 前端通过 Tauri IPC 调用后端
4. **进度事件** - Rust 后端实时发送进度（25% → 50% → 75% → 100%）
5. **上传成功** - 返回图床链接

### 5.4 复制链接并验证

1. **复制链接**
   - 点击 **复制链接** 按钮
   - 链接已复制到剪贴板

2. **验证链接**
   - 打开浏览器，粘贴链接到地址栏
   - 按回车，确认图片可以正常访问

**成功标志**：
- ✅ 图片在浏览器中正常显示
- ✅ 链接格式类似：`https://p9-tcl.byteimg.com/tos-cn-i-...`

---

## 步骤 6：测试配置管理

### 6.1 打开设置页面

1. 点击左侧导航栏的 **设置** 按钮
2. 你会看到 5 个图床的配置选项

### 6.2 测试自动保存

1. **尝试修改配置**（以微博为例）
   - 在"微博 Cookie"输入框中随便输入一些文字
   - 点击输入框外部（失去焦点）
   - 页面底部会显示：**✓ 已自动保存**

2. **验证配置保存**
   - 在 DevTools Console 中运行：
     ```javascript
     await window.store.get('userConfig')
     ```
   - 你会看到刚才输入的内容已保存

### 6.3 查看加密存储

**配置文件位置**：
- **Windows**: `%APPDATA%\com.weibodr.uploader\config.dat`
- **macOS**: `~/Library/Application Support/com.weibodr.uploader/config.dat`
- **Linux**: `~/.config/com.weibodr.uploader/config.dat`

**查看加密内容**（可选）：

```bash
# Windows PowerShell
Get-Content $env:APPDATA\com.weibodr.uploader\config.dat

# macOS/Linux
cat ~/Library/Application\ Support/com.weibodr.uploader/config.dat
```

**你会看到**：
```
U2FsdGVkX1+abc123def456ghi789jkl...（一堆乱码）
```

这是 **AES-GCM 加密**后的内容，无法直接读取，保证了敏感信息的安全性。

---

## 步骤 7：测试历史记录

### 7.1 查看历史记录

1. 点击左侧导航栏的 **历史记录** 按钮
2. 你会看到刚才上传的图片记录

### 7.2 切换视图模式

**表格视图**：
- 显示详细信息（文件名、时间、所有图床链接）
- 适合管理和查找

**网格视图（照片墙）**：
- 大图预览
- 视觉化浏览
- 点击图片查看大图

### 7.3 图床筛选

1. 在顶部选择 **TCL** 过滤器
2. 只显示使用 TCL 上传的记录
3. 切换回 **全部** 显示所有记录

---

## 常见问题和解决方法

### 问题 1：`npm install` 失败

**错误信息**：
```
npm ERR! code ECONNREFUSED
npm ERR! network request to https://registry.npmjs.org/...
```

**解决方法**：
1. 检查网络连接
2. 尝试使用国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com
   npm install
   ```

---

### 问题 2：Rust 编译失败

**错误信息**：
```
error: linker `link.exe` not found
```

**解决方法**（Windows）：
1. 安装 Microsoft Visual C++ Build Tools
2. 下载地址：https://visualstudio.microsoft.com/visual-cpp-build-tools/
3. 安装时勾选 **"使用 C++ 的桌面开发"**
4. 重启终端，重新运行 `npm run tauri dev`

---

### 问题 3：端口被占用

**错误信息**：
```
Port 1420 is already in use
```

**解决方法**：
1. 查找占用端口的进程：
   ```bash
   # Windows
   netstat -ano | findstr :1420

   # macOS/Linux
   lsof -i :1420
   ```

2. 杀死占用进程：
   ```bash
   # Windows
   taskkill /PID <PID> /F

   # macOS/Linux
   kill -9 <PID>
   ```

3. 或者修改 Vite 配置（`vite.config.ts`）使用其他端口

---

### 问题 4：应用窗口不显示

**可能原因**：
- Rust 编译失败（查看终端错误）
- 防火墙拦截
- 系统兼容性问题

**解决方法**：
1. 查看终端是否有 Rust 编译错误
2. 检查防火墙设置，允许应用访问网络
3. 尝试以管理员权限运行（Windows）

---

### 问题 5：上传失败

**错误信息**：
```
[TCLUploader] 上传失败: Network error
```

**解决方法**：
1. 检查网络连接
2. 确认图片文件格式支持（jpg、png、gif、bmp、webp）
3. 确认图片大小 < 10MB
4. 查看 DevTools Console 的详细错误信息

---

## 实战练习

### 练习 1：测试所有零配置图床

**任务**：
1. 上传同一张图片到 TCL 和京东两个图床
2. 对比上传速度
3. 验证两个图床的链接都可以正常访问

**预期结果**：
- ✅ 两个图床都上传成功
- ✅ 两个链接都可以正常访问
- ✅ 观察到京东速度通常更快（⭐⭐⭐⭐⭐）

---

### 练习 2：查看并行上传

**任务**：
1. 勾选 TCL、京东、牛客三个图床
2. 上传一张图片
3. 在 DevTools Console 中观察并行上传日志

**预期日志**：
```javascript
[MultiServiceUploader] 开始并行上传到 3 个图床
[TCLUploader] 开始上传...
[JDUploader] 开始上传...
[NowcoderUploader] 开始上传...
[JDUploader] 上传成功（主力图床）
[TCLUploader] 上传成功（备份）
[NowcoderUploader] 上传失败（未配置Cookie）
```

**观察要点**：
- 三个图床同时开始上传（并行）
- 第一个成功的成为"主力"
- 未配置的图床会失败，但不影响其他

---

### 练习 3：热重载测试

**任务**：
1. 打开 `src/style.css`
2. 修改一个颜色值（例如：把按钮颜色改为红色）
3. 保存文件
4. 观察应用窗口**自动刷新**，颜色立即改变

**这展示了什么？**
- Vite 的热重载功能
- 修改代码后无需手动重启
- 提高开发效率

---

## 下一步学习

### 已完成
- ✅ 成功运行项目
- ✅ 理解开发模式的特性
- ✅ 测试基本上传功能
- ✅ 熟悉 DevTools 调试

### 接下来
1. [**05-directory-tour.md**](./05-directory-tour.md) - 目录结构导览
   - 深入理解项目文件组织
   - 了解每个目录的作用
   - 找到关键代码文件

2. [**第 2 章：核心概念**](../02-core-concepts/01-plugin-architecture.md)
   - 插件化架构详解
   - 设计模式应用
   - 类型系统设计

---

## 总结

通过本节，你已经：

✅ **成功运行了项目** - 看到了应用界面，理解了启动流程
✅ **掌握了基本调试技巧** - 使用 DevTools 查看日志和状态
✅ **测试了核心功能** - 上传图片、查看进度、复制链接
✅ **理解了零配置图床** - TCL 和京东无需配置，开箱即用
✅ **熟悉了开发模式** - 热重载、详细日志、快速迭代

**下一步**，我们将深入探索项目的目录结构，了解每个文件的作用和组织方式！🚀
