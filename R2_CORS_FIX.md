# 🔧 R2 CORS 错误快速修复指南

## ❌ 错误信息

如果您看到以下错误：

```
Access to fetch at 'https://xxx.r2.cloudflarestorage.com/...' from origin 'http://localhost:1420' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**这意味着您的 R2 存储桶没有配置 CORS 规则！**

---

## ✅ 快速修复步骤（5 分钟）

### 步骤 1：登录 Cloudflare Dashboard

1. 访问 [https://dash.cloudflare.com/](https://dash.cloudflare.com/)
2. 登录您的账户

### 步骤 2：进入 R2 存储桶设置

1. 在左侧菜单中点击 **R2**
2. 找到并点击您的存储桶名称（例如：`img`）

### 步骤 3：配置 CORS 规则

1. 点击顶部的 **Settings**（设置）标签
2. 向下滚动找到 **CORS Policy**（CORS 策略）部分
3. 点击 **Edit**（编辑）或 **Add CORS Policy**（添加 CORS 策略）

### 步骤 4：粘贴 CORS 配置

**选项 A：允许所有来源（最简单，适合个人使用）**

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**选项 B：仅允许本地开发（更安全）**

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:*",
      "tauri://localhost",
      "http://127.0.0.1:*"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 步骤 5：保存并等待

1. 点击 **Save**（保存）按钮
2. **等待 2-5 分钟**让配置生效
3. 重新尝试上传文件

---

## 🎯 验证修复

配置完成后：

1. 在应用中点击"测试 R2 连接"按钮（应该显示成功）
2. 尝试上传一张图片
3. 检查控制台，应该不再有 CORS 错误
4. 如果仍有问题，等待更长时间（最多 10 分钟）或检查配置是否正确

---

## 📸 配置位置截图说明

在 Cloudflare Dashboard 中：

```
R2 → [您的存储桶] → Settings → CORS Policy
```

---

## ❓ 常见问题

**Q: 配置后仍然报错？**  
A: 等待 5-10 分钟让配置生效。如果仍然有问题，检查 JSON 格式是否正确。

**Q: 使用 `*` 是否安全？**  
A: 对于个人使用的存储桶，使用 `*` 是可以接受的。如果您担心安全性，使用选项 B。

**Q: 配置后需要重启应用吗？**  
A: 不需要重启应用，但需要等待几分钟让 Cloudflare 的配置生效。

**Q: 如何验证 CORS 是否生效？**  
A: 在浏览器开发者工具中，查看 Network 标签。如果 CORS 配置正确，您应该看到 `Access-Control-Allow-Origin` 响应头。

---

## 🔒 安全提示

- 如果您的存储桶包含敏感数据，建议使用选项 B（限制来源）
- 定期检查 CORS 配置，确保只允许必要的来源
- 不要在生产环境中使用过于宽松的 CORS 规则

---

**修复完成后，您的 R2 备份功能应该可以正常工作了！** 🎉

