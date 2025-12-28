# PicNexus

<div align="center">

<img src="src-tauri/icons/icon.png" alt="PicNexus" width="128">

**多图床上传工具** - 一次上传，多处备份

[![License](https://img.shields.io/badge/License-PolyForm%20Shield-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)]()
[![Version](https://img.shields.io/badge/Version-1.0.1-green)]()

</div>

## 这是什么？

一个图床上传工具，可以同时把图片传到多个图床，互为备份。

**亮点**：3 个图床开箱即用，不用配置任何东西，下载就能用。

## 30 秒上手

1. 下载安装
2. 打开软件，默认已勾选 TCL 和京东
3. 拖图片进去，完成！

## 支持的图床

| 图床 | 需要配置吗 | 说明 |
|------|-----------|------|
| **TCL** | 不需要 ✅ | 开箱即用 |
| **京东** | 不需要 ✅ | 开箱即用，速度快 |
| **七鱼** | 不需要 ✅ | 开箱即用 |
| **微博** | Cookie | 从 m.weibo.cn 获取 |
| **知乎** | Cookie | 从 zhihu.com 获取 |
| **牛客** | Cookie | 从 nowcoder.com 获取 |
| **纳米** | Cookie + Token | 从 nami.cc 获取 |
| **R2** | API 密钥 | Cloudflare 对象存储，永久有效 |

## 怎么获取 Cookie？

以微博为例：

1. 打开 [m.weibo.cn](https://m.weibo.cn) 并登录
2. 按 `F12` 打开开发者工具
3. 点 Network 标签，刷新页面
4. 随便点一个请求，找到 `Cookie` 那一行，复制值
5. 粘贴到软件设置里

其他图床同理。

## R2 配置

Cloudflare R2 是永久存储，适合重要图片：

1. 登录 [Cloudflare](https://dash.cloudflare.com) → R2 → 创建存储桶
2. 创建 API Token
3. 在存储桶设置里配置 CORS：
```json
[{"AllowedOrigins": ["*"], "AllowedMethods": ["GET", "PUT", "POST", "DELETE"], "AllowedHeaders": ["*"]}]
```
4. 把 Account ID、Access Key、Secret Key、Bucket Name 填到软件里

## 其他功能

- **历史记录**：查看上传过的图片，支持表格和网格两种视图
- **链接检测**：批量检查图片链接是否还有效
- **R2 管理**：浏览、删除 R2 里的图片
- **备份同步**：导入导出配置，支持 WebDAV 同步

## 开发

```bash
npm install
npm run tauri dev
```

构建：`npm run tauri build`

需要 Node.js 18+ 和 Rust 环境。

## 常见问题

**Q: 用哪个图床好？**
A: 新手用 TCL + 京东就够了。重要图片加个 R2。

**Q: Cookie 会过期吗？**
A: 会，大概 7-30 天。R2 的 API 密钥不会过期。

## 免责声明

本软件仅供学习研究使用。使用者需自行遵守相关平台的服务条款，因使用本软件产生的任何法律责任由使用者自行承担。

## 许可证

[PolyForm Shield 1.0.0](LICENSE) - 禁止用于竞争性用途
