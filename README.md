# WeiboDR-Uploader

<div align="center">

**微博灾备上传器 - 轻量级跨平台图片上传与备份工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)]()
[![Version](https://img.shields.io/badge/Version-2.6-green)]()

[简体中文](#) | [English](#)

</div>

---

## 📖 目录

- [项目简介](#-项目简介)
- [核心功能](#-核心功能)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [使用指南](#-使用指南)
- [配置说明](#-配置说明)
- [常见问题](#-常见问题)
- [项目结构](#-项目结构)
- [开发指南](#-开发指南)
- [许可证](#-许可证)

---

## 🎯 项目简介

WeiboDR-Uploader 是一个基于 Tauri 框架开发的跨平台桌面应用，旨在提供便捷的图片上传和多重备份解决方案。通过微博图床服务实现图片托管，同时支持 Cloudflare R2 云存储备份和 WebDAV 历史记录同步。

### 为什么选择 WeiboDR-Uploader？

- 🚀 **极简操作** - 拖拽即传，自动完成上传、备份和链接生成
- 🔒 **安全可靠** - 所有敏感信息加密存储在本地，不上传到任何第三方服务器
- 📊 **实时监控** - 可视化上传队列，精确到每个文件的进度反馈
- 💾 **多重备份** - 支持 R2 云存储和 WebDAV 自动备份，数据永不丢失
- 🎯 **智能管理** - 内置 R2 管理器，可浏览、查看和删除已上传文件
- ⚡ **高效并发** - 支持同时上传多个文件，节省时间
- 🌐 **跨平台** - 一次编译，Windows/macOS/Linux 通用

---

## ✨ 核心功能

### 1. 图片上传与备份

- **拖拽上传** - 支持拖拽或点击选择图片文件
- **批量处理** - 支持同时上传多个文件（最多3个并发）
- **文件验证** - 自动验证文件类型（支持 jpg、png、gif、bmp、webp）
- **微博托管** - 上传到微博图床，获得稳定的图片链接
- **R2 备份** - 可选备份到 Cloudflare R2 云存储
- **链接格式** - 支持百度代理、微博原始、R2 链接三种格式

### 2. 实时上传队列

- **可视化进度** - 每个文件独立显示微博和 R2 上传进度
- **状态反馈** - 实时显示等待、进行中、完成、失败等状态
- **预览图** - 上传成功后显示图片缩略图
- **一键复制** - 快速复制微博、百度代理或 R2 链接

### 3. R2 云存储管理

- **文件浏览** - 网格布局展示 R2 存储桶中的所有图片
- **预览与下载** - 点击图片可查看大图和原始链接
- **文件删除** - 支持删除不需要的图片文件
- **智能缓存** - 按需刷新机制，减少 API 调用次数

### 4. 历史记录管理

- **记录保存** - 自动保存最近的上传记录（可配置数量）
- **WebDAV 同步** - 自动同步历史记录到 WebDAV 服务
- **多链接查看** - 查看每条记录的微博、百度代理、R2 多种链接
- **快速复制** - 一键复制任意格式的链接

### 5. 配置与测试

- **自动保存** - 配置修改后自动保存，无需手动点击
- **连接测试** - 提供 R2 和 WebDAV 连接测试功能
- **加密存储** - 使用 tauri-plugin-store 加密存储敏感信息
- **详细反馈** - 测试失败时提供详细的错误信息和解决建议

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Tauri** | 1.5.x | 跨平台桌面应用框架 |
| **TypeScript** | 5.3.x | 前端开发语言 |
| **Rust** | 1.70+ | 后端开发语言 |
| **Vite** | 5.0.x | 前端构建工具 |
| **AWS SDK (S3)** | 3.490+ | Cloudflare R2 交互 |
| **tauri-plugin-store** | - | 加密本地存储 |

---

## 🚀 快速开始

### 环境要求

在开始之前，请确保已安装以下环境：

- **Node.js** 18.0 或更高版本
- **Rust** 1.70 或更高版本
- **系统依赖**（根据操作系统）

#### Windows
- Microsoft Visual C++ Build Tools
- 下载地址：https://visualstudio.microsoft.com/visual-cpp-build-tools/

#### macOS
```bash
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### 安装步骤

#### 1. 克隆项目
```bash
git clone <repository-url>
cd WeiboDR-Uploader
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 开发模式运行
```bash
npm run tauri dev
```

#### 4. 构建生产版本
```bash
npm run tauri build
```

构建完成后，可执行文件位于：
- **Windows**: `src-tauri/target/release/WeiboDR-Uploader.exe`
- **macOS**: `src-tauri/target/release/bundle/macos/WeiboDR-Uploader.app`
- **Linux**: `src-tauri/target/release/weibodr-uploader`

---

## 📚 使用指南

### 首次使用配置

#### 1. 获取微博 Cookie（必需）

微博 Cookie 是上传图片的必要凭证。

**获取步骤：**

1. 点击应用设置页面中的 **🌐 获取Cookie** 按钮
2. 在打开的浏览器中访问 **m.weibo.cn**（必须是移动版）
3. 登录您的微博账号
4. 登录成功后，按 `F12` 打开开发者工具
5. 切换到 `Console`（控制台）标签
6. 输入以下命令并回车：
   ```javascript
   document.cookie
   ```
7. 复制输出的**完整内容**（包含 SUB、SUBP 等字段）
8. 粘贴到应用的 Cookie 输入框中
9. 配置会自动保存

**⚠️ 重要提示：**
- 必须从 **m.weibo.cn** (移动版) 获取 Cookie
- 不要从 weibo.com (桌面版) 获取，会导致上传失败
- Cookie 通常 30 天左右过期，过期后需重新获取

#### 2. 配置 Cloudflare R2（可选）

R2 备份是可选功能，如果需要多重备份，请按以下步骤配置：

**获取 R2 凭证：**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2** 页面
3. 复制 **Account ID**（在右上角）
4. 点击"管理 R2 API 令牌"创建 API 令牌
5. 记录 **Access Key ID** 和 **Secret Access Key**
6. 创建或选择一个 **Bucket**（存储桶）

**配置 CORS 规则（重要）：**

在 R2 存储桶设置中添加 CORS 规则：

```json
[
  {
    "AllowedOrigins": ["tauri://localhost", "http://localhost:*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**在应用中填写配置：**

| 字段 | 说明 | 示例 |
|------|------|------|
| R2 账户 ID | Account ID | `a1b2c3d4e5f6...` |
| R2 访问密钥 ID | Access Key ID | `abc123def456...` |
| R2 访问密钥 | Secret Access Key | `xyz789uvw012...` |
| R2 存储桶名称 | Bucket Name | `my-images` |
| R2 自定义路径 | 文件路径前缀（可选） | `blog/images/` |
| R2 公开访问域名 | 自定义域名（可选） | `https://img.example.com` |

**测试连接：**
填写完成后，点击 **测试 R2 连接** 按钮验证配置是否正确。

#### 3. 配置 WebDAV 自动备份（可选）

WebDAV 用于自动备份历史记录文件。

**以坚果云为例：**

1. 登录坚果云网页版
2. 进入"账户信息" → "安全选项"
3. 点击"添加应用密码"
4. 记录生成的授权码（格式：`xxxx-xxxx-xxxx-xxxx`）

**在应用中填写配置：**

| 字段 | 说明 | 示例 |
|------|------|------|
| WebDAV URL | WebDAV 服务器地址 | `https://dav.jianguoyun.com/dav/` |
| WebDAV 用户名 | 登录用户名 | `user@example.com` |
| WebDAV 密码 | 应用授权码（不是登录密码） | `xxxx-xxxx-xxxx-xxxx` |
| 远程路径 | 历史记录文件路径 | `/WeiboDR/history.json` |

**测试连接：**
填写完成后，点击 **测试 WebDAV 连接** 按钮验证配置是否正确。

### 上传图片

#### 方式一：拖拽上传

1. 将图片文件拖拽到顶部上传区域
2. 有效文件会自动添加到上传队列
3. 实时查看每个文件的上传进度
4. 上传完成后点击按钮复制链接

#### 方式二：点击上传

1. 点击顶部上传区域
2. 在文件对话框中选择一个或多个图片
3. 后续流程同拖拽上传

#### 上传选项

- **同时备份到 Cloudflare R2** - 勾选此选项会在微博上传成功后自动备份到 R2
- **文件类型支持** - jpg、jpeg、png、gif、bmp、webp
- **并发上传** - 最多同时上传 3 个文件

### 查看和管理 R2 文件

1. 点击左侧导航栏的 **R2 管理器** 按钮
2. 首次进入会自动加载 R2 存储桶中的所有图片
3. 点击图片可查看大图和原始链接
4. 点击删除按钮可删除不需要的文件
5. 刷新按钮可手动重新加载列表

### 查看上传历史

1. 点击左侧导航栏的 **历史记录** 按钮
2. 查看最近的上传记录
3. 点击复制按钮可复制各种格式的链接
4. 点击"同步到 WebDAV"可手动触发同步

---

## ⚙️ 配置说明

### 输出格式选择

应用支持三种链接格式：

| 格式 | 说明 | 示例 |
|------|------|------|
| **百度代理** | 通过百度代理访问微博图片（推荐） | `https://img.xxx.com/xxx.jpg` |
| **微博原始** | 微博图床原始链接 | `https://wx1.sinaimg.cn/large/xxx.jpg` |
| **R2 链接** | Cloudflare R2 公开访问链接 | `https://img.example.com/xxx.jpg` |

### 自动保存机制

**v2.0+ 版本采用自动保存：**
- 修改配置后点击输入框外部即自动保存
- 页面底部显示"✓ 已自动保存"确认消息
- 无需手动点击保存按钮

### 安全性说明

- **本地存储** - 所有配置信息存储在本地，使用加密存储
- **不上传数据** - 不会向任何第三方服务器发送敏感信息
- **Cookie 安全** - Cookie 仅用于微博上传，不会被滥用
- **密钥保护** - R2 密钥和 WebDAV 密码加密存储

---

## ❓ 常见问题

### Q1: 微博上传失败，提示 Cookie 无效？

**A:** 可能的原因和解决方法：

1. **Cookie 过期** - 微博 Cookie 通常 30 天过期，请重新获取
2. **从错误的地方获取** - 必须从 **m.weibo.cn**（移动版）获取，不能从 weibo.com（桌面版）获取
3. **Cookie 不完整** - 确保复制了完整的 Cookie 字符串，包含 SUB、SUBP 等字段
4. **网络问题** - 检查网络连接是否正常

### Q2: R2 备份失败，提示 CORS 错误？

**A:** 这是最常见的 R2 问题。解决方法：

1. 在 Cloudflare R2 Dashboard 中进入您的存储桶
2. 点击 **Settings** → **CORS Policy**
3. 添加 CORS 规则（参考上文"配置 Cloudflare R2"部分）
4. 保存后等待几分钟让设置生效
5. 重新测试连接

### Q3: WebDAV 测试连接失败，提示用户名或密码错误？

**A:** WebDAV 密码不是登录密码，是应用授权码：

- **坚果云** - 需要在"安全选项"中生成应用授权码
- **Nextcloud** - 可以使用账户密码或创建应用密码
- **其他服务** - 请查阅服务商的 WebDAV 文档

### Q4: 上传的图片预览加载很慢或失败？

**A:** 可能的原因：

1. **网络问题** - 微博图床在部分地区可能被限速
2. **使用百度代理** - 百度代理链接在部分环境下可能加载较慢
3. **切换链接格式** - 尝试使用"微博原始"或"R2 链接"格式

### Q5: 可以同时上传多少个文件？

**A:** 
- 默认支持最多 **3 个文件** 同时上传
- 超过 3 个会自动排队等待
- 这是为了避免过多并发请求导致失败

### Q6: R2 管理器显示的图片数量有限制吗？

**A:** 
- 单次最多加载 **1000 个** 文件
- 如果文件过多，建议使用 R2 Dashboard 或设置合理的路径前缀

### Q7: 历史记录最多保存多少条？

**A:**
- 默认保存最近 **20 条** 记录
- 可以在配置文件中修改（需要编辑代码）
- WebDAV 备份会保存完整的历史记录 JSON 文件

### Q8: Cookie 中文显示乱码或无法保存？

**A:**
- 确保从浏览器 Console 直接复制 `document.cookie` 的输出
- 不要使用第三方工具或插件获取 Cookie
- 如果包含中文字符，建议使用原生浏览器开发者工具

---

## 📁 项目结构

```
WeiboDR-Uploader/
├── src/                          # 前端源码
│   ├── main.ts                   # 主窗口逻辑、导航、状态管理
│   ├── coreLogic.ts              # 核心上传工作流和业务逻辑
│   ├── weiboUploader.ts          # 微博上传 API 封装
│   ├── uploadQueue.ts            # 上传队列管理器
│   ├── r2-manager.ts             # R2 管理器逻辑
│   ├── config.ts                 # 配置类型定义和默认值
│   ├── store.ts                  # 本地存储操作封装
│   ├── errors.ts                 # 错误处理工具函数
│   ├── style.css                 # 全局样式
│   ├── ui/                       # UI 组件模块
│   │   ├── settings-view.ts      # 设置视图逻辑
│   │   ├── history-view.ts       # 历史记录视图逻辑
│   │   └── ...                   # 其他视图模块
│   └── login-webview.ts          # 登录指导窗口逻辑
├── src-tauri/                    # Rust 后端
│   ├── src/
│   │   └── main.rs               # Tauri 主文件、系统托盘
│   ├── Cargo.toml                # Rust 依赖配置
│   ├── tauri.conf.json           # Tauri 应用配置
│   └── icons/                    # 应用图标
├── index.html                    # 主窗口 HTML
├── login-webview.html            # 登录指导窗口 HTML
├── package.json                  # Node.js 依赖和脚本
├── tsconfig.json                 # TypeScript 配置
├── vite.config.ts                # Vite 构建配置
├── README.md                     # 项目文档（本文件）
└── .gitignore                    # Git 忽略规则
```

### 核心模块说明

| 模块 | 文件 | 功能 |
|------|------|------|
| **主窗口逻辑** | `src/main.ts` | 应用入口、导航、视图切换、状态管理 |
| **核心业务** | `src/coreLogic.ts` | 上传工作流、备份逻辑、历史记录 |
| **微博上传** | `src/weiboUploader.ts` | 微博 API 调用、文件上传 |
| **队列管理** | `src/uploadQueue.ts` | 上传队列、进度显示、并发控制 |
| **R2 管理** | `src/r2-manager.ts` | R2 文件浏览、删除、刷新 |
| **配置管理** | `src/config.ts` | 类型定义、默认配置 |
| **存储操作** | `src/store.ts` | 加密存储、配置读写 |
| **后端服务** | `src-tauri/src/main.rs` | 系统托盘、Rust 命令 |

---

## 🔧 开发指南

### 代码风格规范

项目遵循严格的代码风格规范，详见 `.cursorrules` 文件。

**TypeScript:**
- 使用 TypeScript 严格模式
- 函数使用 `async/await` 处理异步操作
- 使用 `const` 和 `let`，避免 `var`
- 函数和变量使用驼峰命名（camelCase）
- 所有错误处理必须包含详细的错误信息

**Rust:**
- 遵循 Rust 官方代码风格（rustfmt）
- 使用 `Result<T, E>` 进行错误处理
- 函数名使用 snake_case
- 添加文档注释（`///`）

### 错误处理规范

**TypeScript:**
```typescript
async function exampleFunction(): Promise<void> {
  try {
    // 操作逻辑
    console.log('[模块名] 操作成功');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[模块名] 操作失败:', error);
    // 用户可见的错误消息使用中文
    throw new Error(`操作失败: ${errorMsg}`);
  }
}
```

**Rust:**
```rust
#[tauri::command]
async fn example_command(param: String) -> Result<String, String> {
    if param.is_empty() {
        return Err("参数不能为空".to_string());
    }
    
    // 操作逻辑
    
    Ok("操作成功".to_string())
}
```

### 调试技巧

**前端调试：**
```bash
# 开发模式运行（自动打开 DevTools）
npm run tauri dev
```

**后端调试：**
```rust
// 在 main.rs 中添加日志
println!("[Rust] Debug info: {:?}", variable);
```

**查看应用日志：**
- Windows: `%APPDATA%\com.weibodr.uploader\logs\`
- macOS: `~/Library/Application Support/com.weibodr.uploader/logs/`
- Linux: `~/.config/com.weibodr.uploader/logs/`

### 构建优化

**开发构建（快速）：**
```bash
npm run tauri dev
```

**生产构建（优化）：**
```bash
npm run tauri build
```

**仅构建前端：**
```bash
npm run build
```

### 贡献指南

欢迎提交 Issue 和 Pull Request！

**提交 PR 前请确保：**
1. 代码符合项目规范
2. 所有功能正常工作
3. 没有 TypeScript 或 Rust 编译错误
4. 添加了必要的注释和文档
5. 测试了主要功能流程

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2025 WeiboDR-Uploader

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🎉 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [Weibo-Picture-Store](https://github.com/Semibold/Weibo-Picture-Store) - 微博图床上传参考
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - 对象存储服务
- [AWS SDK for JavaScript](https://aws.amazon.com/sdk-for-javascript/) - S3 兼容 SDK

---

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/your-username/WeiboDR-Uploader/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/WeiboDR-Uploader/discussions)
- **Email**: your-email@example.com

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**

Made with ❤️ by WeiboDR-Uploader Team

</div>
