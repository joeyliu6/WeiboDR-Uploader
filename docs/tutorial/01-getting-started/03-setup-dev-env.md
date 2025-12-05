# 开发环境搭建

> 从零开始，配置 WeiboDR-Uploader 的完整开发环境

---

## 📋 学习目标

完成本节学习后，你将能够：

- ✅ 安装 Node.js 18+ 和 Rust 1.70+
- ✅ 配置 Windows/macOS/Linux 的系统依赖
- ✅ 安装 VS Code 和推荐插件
- ✅ 解决常见的环境配置问题

---

## 前置知识

- 基本的命令行操作
- 知道如何安装软件

---

## 1. 环境要求概览

### 1.1 必需软件

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| **Node.js** | 18.0+ | 运行前端构建工具（Vite） |
| **npm** | 9.0+ | Node.js 包管理器（随 Node.js 安装） |
| **Rust** | 1.70+ | 编译 Tauri 后端 |
| **系统依赖** | 见下文 | 编译 Tauri 应用所需 |

### 1.2 推荐软件

| 软件 | 用途 |
|------|------|
| **VS Code** | 代码编辑器（最佳 Tauri 开发体验） |
| **Git** | 版本控制 |
| **Chrome/Edge** | 调试前端代码 |

---

## 2. 安装 Node.js

### 2.1 Windows 安装

#### 方法1：官网下载（推荐）

1. **访问官网**：
   - 打开 https://nodejs.org/
   - 下载 **LTS 版本**（长期支持版，如 20.x）

2. **运行安装程序**：
   - 双击下载的 `.msi` 文件
   - 勾选 "Automatically install the necessary tools"
   - 点击 "Next" → "Install"

3. **验证安装**：
   ```bash
   # 打开 PowerShell 或 CMD
   node --version
   # 输出：v20.11.0（版本号可能不同）

   npm --version
   # 输出：10.2.4
   ```

#### 方法2：使用 Chocolatey

```powershell
# 以管理员身份运行 PowerShell
choco install nodejs-lts
```

---

### 2.2 macOS 安装

#### 方法1：官网下载

1. 访问 https://nodejs.org/
2. 下载 macOS Installer (.pkg)
3. 双击安装

#### 方法2：使用 Homebrew（推荐）

```bash
# 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node@20
```

#### 验证安装

```bash
node --version
npm --version
```

---

### 2.3 Linux 安装

#### Ubuntu/Debian

```bash
# 使用 NodeSource 仓库（推荐）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node --version
npm --version
```

#### Fedora/RHEL/CentOS

```bash
# 使用 NodeSource 仓库
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 验证
node --version
npm --version
```

---

### 2.4 配置 npm 镜像（可选，国内推荐）

如果下载速度慢，可以配置淘宝镜像：

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 验证配置
npm config get registry
# 输出：https://registry.npmmirror.com/
```

---

## 3. 安装 Rust

### 3.1 Windows 安装

#### 步骤1：安装 Visual Studio Build Tools

Rust 需要 C++ 编译器，必须先安装。

1. **下载 Visual Studio Build Tools**：
   - 访问：https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - 下载 "Build Tools for Visual Studio 2022"

2. **运行安装程序**：
   - 勾选 **"Desktop development with C++"**
   - 在右侧确保勾选：
     - ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
     - ✅ Windows 10 SDK
   - 点击 "Install"（约 6GB，需要时间）

#### 步骤2：安装 Rust

```powershell
# 下载并运行 rustup-init.exe
# 访问：https://rustup.rs/
# 或直接运行：
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe

# 安装过程中：
# 1. 选择 "1) Proceed with installation (default)"
# 2. 等待安装完成
# 3. 重启 PowerShell
```

#### 验证安装

```powershell
rustc --version
# 输出：rustc 1.75.0 (82e1608df 2023-12-21)

cargo --version
# 输出：cargo 1.75.0 (1d8b05cdd 2023-11-20)
```

---

### 3.2 macOS 安装

```bash
# 安装 Xcode Command Line Tools（如果没有）
xcode-select --install

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 选择 "1) Proceed with installation (default)"

# 配置环境变量
source $HOME/.cargo/env

# 验证
rustc --version
cargo --version
```

---

### 3.3 Linux 安装

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 选择默认安装

# 配置环境变量
source $HOME/.cargo/env

# 验证
rustc --version
cargo --version
```

---

## 4. 系统依赖配置

### 4.1 Windows

Windows 只需要 Visual Studio Build Tools（已在安装 Rust 时完成）。

**额外优化**（可选）：

```powershell
# 配置 Rust 使用国内镜像（加速 cargo build）
# 创建或编辑 ~/.cargo/config.toml
New-Item -Path $HOME\.cargo -Name config.toml -ItemType File -Force
Add-Content -Path $HOME\.cargo\config.toml -Value @"
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
"@
```

---

### 4.2 macOS

macOS 只需要 Xcode Command Line Tools（已在安装 Rust 时完成）。

---

### 4.3 Ubuntu/Debian

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**解释**：
- `libwebkit2gtk-4.0-dev`：WebView 渲染引擎（Tauri 核心）
- `build-essential`：编译工具链（gcc、g++、make）
- `libssl-dev`：HTTPS 支持
- `libgtk-3-dev`：GTK 图形库
- `libayatana-appindicator3-dev`：系统托盘支持
- `librsvg2-dev`：SVG 图标支持

---

### 4.4 Fedora/RHEL/CentOS

```bash
sudo dnf install -y \
  webkit2gtk4.0-devel \
  openssl-devel \
  curl \
  wget \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel

# 安装开发工具
sudo dnf groupinstall -y "Development Tools"
```

---

### 4.5 Arch Linux

```bash
sudo pacman -S --needed \
  webkit2gtk \
  base-devel \
  curl \
  wget \
  openssl \
  gtk3 \
  libappindicator-gtk3 \
  librsvg
```

---

## 5. 安装 VS Code 和插件

### 5.1 安装 VS Code

#### Windows/macOS/Linux

1. 访问：https://code.visualstudio.com/
2. 下载对应平台的安装包
3. 运行安装程序

---

### 5.2 推荐插件

#### 必装插件

打开 VS Code，按 `Ctrl+Shift+X`（Windows/Linux）或 `Cmd+Shift+X`（macOS）打开扩展市场。

**1. Vue Language Features (Volar)**
- ID: `Vue.volar`
- 作用：Vue 3 语法高亮、智能提示、类型检查
- 安装：搜索 "Volar" → Install

**2. TypeScript Vue Plugin (Volar)**
- ID: `Vue.vscode-typescript-vue-plugin`
- 作用：让 TypeScript 识别 `.vue` 文件
- 安装：搜索 "TypeScript Vue Plugin" → Install

**3. rust-analyzer**
- ID: `rust-lang.rust-analyzer`
- 作用：Rust 智能提示、代码补全、错误检查
- 安装：搜索 "rust-analyzer" → Install

**4. Tauri**
- ID: `tauri-apps.tauri-vscode`
- 作用：Tauri 开发辅助工具
- 安装：搜索 "Tauri" → Install

**5. ESLint**
- ID: `dbaeumer.vscode-eslint`
- 作用：JavaScript/TypeScript 代码规范检查
- 安装：搜索 "ESLint" → Install

---

#### 推荐插件（可选）

**6. GitLens**
- ID: `eamodio.gitlens`
- 作用：增强 Git 功能，查看代码历史

**7. Better Comments**
- ID: `aaron-bond.better-comments`
- 作用：高亮不同类型的注释

**8. Error Lens**
- ID: `usernamehw.errorlens`
- 作用：在代码行内显示错误信息

**9. Prettier**
- ID: `esbenp.prettier-vscode`
- 作用：代码格式化

**10. Path Intellisense**
- ID: `christian-kohler.path-intellisense`
- 作用：文件路径自动补全

---

### 5.3 VS Code 配置

创建或编辑 `.vscode/settings.json`：

```json
{
  // Vue 配置
  "volar.takeOverMode": true,

  // TypeScript 配置
  "typescript.tsdk": "node_modules/typescript/lib",

  // 格式化配置
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // Rust 配置
  "rust-analyzer.checkOnSave.command": "clippy",

  // 文件关联
  "files.associations": {
    "*.rs": "rust"
  }
}
```

---

## 6. 验证环境配置

### 6.1 检查清单

运行以下命令，确保所有工具都已安装：

```bash
# Node.js
node --version
# 期望：v18.0.0 或更高

npm --version
# 期望：9.0.0 或更高

# Rust
rustc --version
# 期望：rustc 1.70.0 或更高

cargo --version
# 期望：cargo 1.70.0 或更高

# Git（可选）
git --version
# 期望：git version 2.x.x
```

---

### 6.2 测试 Tauri 环境

创建一个测试项目：

```bash
# 创建测试目录
mkdir tauri-test
cd tauri-test

# 创建最小的 Tauri 项目
npm create tauri-app

# 根据提示选择：
# - Project name: tauri-test
# - Choose your package manager: npm
# - Choose your UI template: Vanilla
# - Choose your UI flavor: TypeScript

# 进入项目目录
cd tauri-test

# 安装依赖
npm install

# 运行开发模式
npm run tauri dev
```

**期望结果**：
- 编译成功（可能需要5-10分钟，首次编译会下载依赖）
- 打开一个窗口，显示 "Welcome to Tauri!"

**如果成功**：✅ 环境配置正确！
**如果失败**：请查看下面的故障排除。

---

## 7. 故障排除

### 7.1 Windows 常见问题

#### 问题1：找不到 `node` 命令

**原因**：环境变量未配置

**解决**：
1. 右键 "此电脑" → "属性" → "高级系统设置"
2. 点击 "环境变量"
3. 在 "系统变量" 中找到 `Path`
4. 确认包含：`C:\Program Files\nodejs\`
5. 重启 PowerShell

---

#### 问题2：Rust 编译失败，提示找不到 `link.exe`

**原因**：未安装 Visual Studio Build Tools

**解决**：
- 重新安装 Visual Studio Build Tools
- 确保勾选 "Desktop development with C++"

---

#### 问题3：`npm install` 很慢

**解决**：
```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 或使用 cnpm
npm install -g cnpm --registry=https://registry.npmmirror.com
cnpm install
```

---

### 7.2 macOS 常见问题

#### 问题1：`xcode-select --install` 提示已安装但找不到编译器

**解决**：
```bash
# 重置 Xcode Command Line Tools
sudo xcode-select --reset
sudo xcode-select --install
```

---

#### 问题2：`cargo build` 提示权限错误

**解决**：
```bash
# 修复 cargo 目录权限
sudo chown -R $(whoami) ~/.cargo
```

---

### 7.3 Linux 常见问题

#### 问题1：`libwebkit2gtk-4.0-dev` 找不到

**Ubuntu 22.04+**：
```bash
sudo apt install -y libwebkit2gtk-4.1-dev
```

**其他版本**：
```bash
# 更新包列表
sudo apt update
sudo apt install -y libwebkit2gtk-4.0-dev
```

---

#### 问题2：编译时提示 `cannot find -lssl`

**解决**：
```bash
sudo apt install -y libssl-dev pkg-config
```

---

### 7.4 网络问题

#### Rust crates 下载慢

**使用国内镜像**：

编辑 `~/.cargo/config.toml`（Windows: `%USERPROFILE%\.cargo\config.toml`）：

```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "https://mirrors.ustc.edu.cn/crates.io-index"
```

或使用字节跳动镜像：

```toml
[source.crates-io]
replace-with = 'rsproxy'

[source.rsproxy]
registry = "https://rsproxy.cn/crates.io-index"
```

---

## 8. 总结

### 🎯 本节要点

1. **Node.js 18+**：前端构建工具
2. **Rust 1.70+**：后端编译
3. **系统依赖**：
   - Windows: Visual Studio Build Tools
   - macOS: Xcode Command Line Tools
   - Linux: WebKit2GTK、GTK3 等
4. **VS Code + 插件**：最佳开发体验

---

### 📝 检查清单

完成本节后，确认：

- [ ] `node --version` 显示 18.0+
- [ ] `npm --version` 显示 9.0+
- [ ] `rustc --version` 显示 1.70+
- [ ] `cargo --version` 显示 1.70+
- [ ] VS Code 已安装 Volar、rust-analyzer、Tauri 插件
- [ ] 测试 Tauri 项目可以运行

---

### 🚀 下一步

环境配置完成！接下来让我们第一次运行项目：

**[下一节：第一次运行项目 →](04-first-run.md)**

在下一节中，你将学习：
- 克隆项目仓库
- 安装项目依赖
- 运行开发模式
- 测试上传功能
- 查看开发者工具

---

<div align="center">

[⬆ 返回教程目录](../README.md) | [← 上一节](02-architecture-overview.md) | [下一节 →](04-first-run.md)

</div>
