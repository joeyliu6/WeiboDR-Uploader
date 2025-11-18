# WeiboDR-Uploader v1.2.0 更新日志

## 📅 更新日期
2025-11-17

## 🎯 主要变更

### ✅ 已完成

1. **移除账号密码登录功能**
   - 删除了 `login.html` 和 `src/login.ts` 文件
   - 移除界面中的"账号密码登录"按钮
   - 移除后端的 `attempt_weibo_login` 命令
   - 理由：账号密码登录容易触发微博风控和验证码，实际上并不可用

2. **移除自动续期功能**
   - 删除配置中的 `account` 字段（包含账号密码和自动续期开关）
   - 移除 `coreLogic.ts` 中的Cookie自动续期逻辑
   - 简化配置文件结构
   - 理由：没有实际意义，且会给用户造成困惑

3. **简化官方登录功能**
   - 保留"获取Cookie"按钮，打开指导窗口
   - 窗口会在系统浏览器中打开 **m.weibo.cn**
   - 提供详细的手动获取Cookie步骤说明
   - 移除"自动获取Cookie"功能（技术限制，无法访问系统浏览器Cookie）

4. **强调从 m.weibo.cn 获取Cookie**
   - 在界面多处添加提示：必须从 m.weibo.cn（移动版）获取Cookie
   - 说明为什么必须使用移动版：因为应用使用的是移动版API
   - 桌面版（weibo.com）的Cookie无法使用

## 📝 代码修改清单

### 删除的文件
- ❌ `login.html` - 账号密码登录页面
- ❌ `src/login.ts` - 账号密码登录逻辑

### 修改的文件
- ✅ `index.html` - 简化设置界面，移除账号密码相关UI
- ✅ `src/main.ts` - 移除账号密码登录相关代码
- ✅ `src/config.ts` - 移除 `account` 字段
- ✅ `src/coreLogic.ts` - 移除自动续期逻辑，简化Cookie错误处理
- ✅ `src-tauri/src/main.rs` - 移除 `attempt_weibo_login` 和 `get_webview_cookies` 命令
- ✅ `login-webview.html` - 优化为纯指导页面
- ✅ `src/login-webview.ts` - 简化为只打开浏览器功能
- ✅ `OFFICIAL_LOGIN_GUIDE.md` - 更新使用指南

## 🎉 使用说明

### 现在如何获取Cookie

1. 点击设置中的"🌐 获取Cookie"按钮
2. 在打开的浏览器中访问 **m.weibo.cn** 并登录
3. 按 F12 打开开发者工具 → Console（控制台）
4. 输入：`document.cookie` 并回车
5. 复制输出的**完整内容**
6. 粘贴到应用的Cookie输入框中保存

### 重要提示

⚠️ **必须从 m.weibo.cn 获取Cookie！**

- ✅ 正确：从 **m.weibo.cn** (移动版微博) 获取
- ❌ 错误：从 weibo.com (桌面版) 获取会导致上传失败
- Cookie中必须包含 `SUB=` 和 `SUBP=` 等字段

## 🔧 技术细节

### 移除的Rust命令
```rust
#[tauri::command]
async fn attempt_weibo_login(username: String, password: String) -> Result<String, String>

#[tauri::command]
async fn get_webview_cookies(url: String) -> Result<String, String>
```

### 保留的Rust命令
```rust
#[tauri::command]
async fn save_cookie_from_login(cookie: String, app: tauri::AppHandle) -> Result<(), String>
```

### 配置文件变化
```typescript
// 移除前
export interface UserConfig {
  weiboCookie: string;
  r2: R2Config;
  baiduPrefix: string;
  outputFormat: 'baidu' | 'weibo' | 'r2';
  webdav: WebDAVConfig;
  account: AccountConfig;  // ❌ 已移除
}

// 移除后
export interface UserConfig {
  weiboCookie: string;
  r2: R2Config;
  baiduPrefix: string;
  outputFormat: 'baidu' | 'weibo' | 'r2';
  webdav: WebDAVConfig;
}
```

## 🐛 修复的问题

1. ✅ 移除了实际上不可用的账号密码登录
2. ✅ 移除了没有实际作用的自动续期功能
3. ✅ 简化了用户界面，减少困惑
4. ✅ 强调必须从 m.weibo.cn 获取Cookie

## 📊 文件统计

- 删除文件：2个
- 修改文件：8个
- 新增文档：1个（本文档）
- 代码行数减少：约 200+ 行

## 🚀 升级指南

如果您从旧版本升级：

1. 重新编译应用：`npm run tauri build`
2. Cookie不会受影响，可以继续使用
3. 如果Cookie过期，请使用新的获取方式

## 💡 设计理念

这次更新秉持"简单即美"的原则：

- 移除不可用或不必要的功能
- 专注于核心功能：获取Cookie → 上传图片
- 提供清晰的操作指引
- 减少用户困惑

---

**版本**: v1.2.0 - 简化版  
**上一版本**: v1.1.0  
**下一版本**: TBD

