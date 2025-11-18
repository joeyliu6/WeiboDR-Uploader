# WeiboDR-Uploader 文档中心

本目录包含 WeiboDR-Uploader 项目的所有文档。

## 📚 文档结构

### 用户指南 (guides/)

用户使用手册和配置指南：

- **[官方登录指南](guides/OFFICIAL_LOGIN_GUIDE.md)** - 如何获取微博 Cookie
- **[R2 设置指南](guides/R2_SETUP_GUIDE.md)** - Cloudflare R2 完整配置教程
- **[WebDAV 设置指南](guides/WEBDAV_SETUP_GUIDE.md)** - WebDAV 自动备份配置指南
- **[WebDAV 路径指南](guides/WEBDAV_PATH_GUIDE.md)** - WebDAV 远程路径配置说明
- **[设置 v2.0 用户指南](guides/SETTINGS_V2_USER_GUIDE.md)** - 新版设置界面使用指南

### 技术文档归档 (archive/)

历史开发文档、技术实现细节和版本更新记录：

#### 版本更新记录
- **[v1.2.0 更新日志](archive/CHANGELOG_v1.2.0.md)** - 简化登录功能的重大更新
- **[v2.6 优化总结](archive/V2.6_OPTIMIZATION_SUMMARY.md)** - 性能优化和用户体验改进

#### 功能实现文档
- **[上传队列实现](archive/UPLOAD_QUEUE_IMPLEMENTATION.md)** - 实时上传队列功能的技术实现
- **[R2 管理器实现](archive/R2_MANAGER_IMPLEMENTATION.md)** - R2 文件管理器的技术细节
- **[设置 v2.0 实现](archive/SETTINGS_V2_IMPLEMENTATION.md)** - 新版设置界面的技术实现
- **[登录功能](archive/LOGIN_FEATURE.md)** - 账号密码登录功能（已废弃）

#### 改进与重构文档
- **[工程改进](archive/ENGINEERING_IMPROVEMENTS.md)** - 工程化改进记录
- **[健壮性改进](archive/ROBUSTNESS_IMPROVEMENTS.md)** - 错误处理和稳定性改进
- **[重构总结](archive/REFACTORING_SUMMARY.md)** - 代码重构记录

#### 问题修复文档
- **[R2 CORS 修复](archive/R2_CORS_FIX.md)** - R2 跨域问题解决方案

#### 其他文档
- **[安装指南](archive/INSTALL.md)** - 详细的开发环境安装步骤（已整合到主 README）
- **[项目总结](archive/PROJECT_SUMMARY.md)** - 项目完成总结

---

## 🔍 快速查找

### 我想...

| 需求 | 推荐文档 |
|------|---------|
| 快速开始使用应用 | [主 README](../README.md) |
| 获取微博 Cookie | [官方登录指南](guides/OFFICIAL_LOGIN_GUIDE.md) |
| 配置 R2 备份 | [R2 设置指南](guides/R2_SETUP_GUIDE.md) |
| 配置 WebDAV 备份 | [WebDAV 设置指南](guides/WEBDAV_SETUP_GUIDE.md) |
| 解决 R2 CORS 错误 | [R2 CORS 修复](archive/R2_CORS_FIX.md) |
| 了解新版设置功能 | [设置 v2.0 用户指南](guides/SETTINGS_V2_USER_GUIDE.md) |
| 了解上传队列如何工作 | [上传队列实现](archive/UPLOAD_QUEUE_IMPLEMENTATION.md) |
| 查看版本更新内容 | [v2.6 优化总结](archive/V2.6_OPTIMIZATION_SUMMARY.md) |

---

## 📝 文档维护

### 文档分类原则

- **用户指南 (guides/)** - 面向最终用户的使用手册和配置指南
- **技术文档归档 (archive/)** - 面向开发者的技术实现、版本记录和历史文档

### 添加新文档

如果需要添加新文档，请按照以下规则：

1. **用户指南** - 放入 `guides/` 目录
2. **技术文档** - 放入 `archive/` 目录
3. **更新本索引** - 在相应分类中添加文档链接

### 文档格式规范

- 使用 Markdown 格式
- 包含清晰的标题层次结构
- 使用中文撰写（面向中文用户）
- 包含示例和截图说明（如适用）
- 保持内容简洁明了

---

## 🔗 相关资源

- [主 README](../README.md) - 项目主页
- [GitHub Repository](https://github.com/your-username/WeiboDR-Uploader)
- [Issue Tracker](https://github.com/your-username/WeiboDR-Uploader/issues)

---

<div align="center">

**文档贡献者** - 感谢所有参与文档编写和维护的贡献者！

</div>

