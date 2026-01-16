# Toast 通知完整清单

> 按文件和行号索引

## App.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 20 | warn | 网络已断开 | 请检查网络连接 |
| 24 | success | 网络已恢复 | 可以继续上传 |

## useConfig.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 72 | error | 读取配置失败 | 已使用默认配置 |
| 78 | error | 加载配置失败 | {errorMsg} |
| 97 | error | 验证失败 | 至少需要启用一个图床 |
| 129 | success | 保存成功 | 配置已保存 |
| 134 | error | 保存失败 | {errorMsg} |
| 140 | error | 保存失败 | {errorMsg} |
| 498 | error | 不支持的服务 | {serviceId} 不支持自动获取 Cookie |
| 560 | error | 打开登录窗口失败 | {errorMessage} |
| 600 | error | Cookie 无效 | 接收到的 Cookie 为空 |
| 613 | success | Cookie 已更新 | {serviceName} Cookie 已自动填充并保存！ |
| 618 | error | 保存失败 | {errorMsg} |
| 623 | error | 处理失败 | {errorMsg} |

## useWebDAVSync.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 253 | success | 上传成功 | 配置已上传到云端 |
| 260 | error | 上传失败 | {errorMsg} |
| 323 | success | 下载成功 | {successMsg} |
| 330 | error | 下载失败 | {errorMsg} |
| 403 | success | 上传成功 | 已上传 {count} 条记录 |
| 416 | error | 上传失败 | {errorMsg} |
| 463 | success | 下载成功 | {successMsg} |
| 476 | error | 下载失败 | {errorMsg} |

## RetryService.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 56 | error | 重试失败 | 队列项不存在 |
| 65 | error | 网络请求失败 | 请检查网络后重试 |
| 111 | success | 修复成功 | {serviceLabel} 已补充上传成功 |
| 126 | error | 重试失败 | 队列项不存在 |
| 141 | error | 重试次数已用尽 | {fileName} 已尝试 {max} 次 |
| 154 | error | 网络请求失败 | 请检查网络后重试 |
| 185 | info | 正在重试 | {fileName} 正在重新上传 (N/M) |
| 234 | warn | 部分服务上传失败 | {fileName}: {failedServices} |
| 420 | error | 重试依然失败 | {serviceLabel}: {errorMsg} |
| 528 | error | 网络请求失败 | 请检查网络后重试 |
| 536 | info | 批量重传中 | 正在重传 N 个失败的图床 |
| 569 | success | 批量重传完成 | 全部 N 个图床重传成功 |
| 574 | error | 批量重传失败 | 全部 N 个图床重传失败 |
| 580 | warn | 批量重传部分完成 | N 个成功，N 个仍失败 |
| 614 | error | {serviceName} 授权失效 | 登录凭证/Cookie 已过期 |
| 621 | error | {serviceName} 鉴权失败 | 请检查 AK/SK 或 Token 配置 |
| 627 | error | 重试依然失败 | {fileName}: {errorMsg} |

## useUpload.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 210 | warn | 保存失败 | 图床选择保存失败，请重试 |
| 258 | error | 文件选择失败 | {errorMsg} |
| 282 | warn | 未检测到图片 | 请选择有效的图片文件 |
| 287 | warn | 部分格式不支持 | 已自动忽略 N 个不支持的文件 |
| 298 | error | 配置加载异常 | 读取配置文件失败 |
| 320 | error | 未选择图床 | 请在上传界面选择至少一个图床服务 |
| 323 | error | 未配置图床 | 请前往设置页启用至少一个图床服务 |
| 341 | error | 上传错误 | 队列管理器未初始化 |
| 348 | error | 上传错误 | 上传失败: {errorMsg} |
| 405 | error | 上传错误 | 上传失败: {errorMsg} |
| 424 | error | 上传错误 | 队列管理器未初始化 |
| 567 | warn | 部分服务上传失败 | {failedServices} |
| 606 | error | {serviceName} 授权失效 | 登录凭证/Cookie 已过期 |
| 614 | error | {serviceName} 鉴权失败 | 请检查配置 |
| 621 | error | 上传失败 | {errorMsg} |
| 628 | error | 上传失败 | {errorMsg} |

## useBackupSync.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 135 | warn | 请先配置 WebDAV 连接 | - |
| 299 | warn | 配置已重置 | 检测到配置数据异常 |
| 310 | warn | 已取消导出 | - |
| 315 | success | 配置已导出到本地文件 | - |
| 319 | error | 导出失败 | {errorMsg} |
| 338 | warn | 已取消导入 | - |
| 346 | error | 导入失败 | 文件内容不是有效的配置数据格式 |
| 363 | warn | 已取消导入 | - |
| 377 | success | 配置已从本地文件导入 | - |
| 380 | info | 部分配置可能需要刷新页面后生效 | - |
| 387 | error | 导入失败 | JSON 格式错误 |
| 389 | error | 导入失败 | {errorMsg} |
| 405 | warn | 没有可导出的历史记录 | - |
| 417 | warn | 已取消导出 | - |
| 422 | success | 已导出 N 条记录到本地文件 | - |
| 426 | error | 导出失败 | {errorMsg} |
| 446 | warn | 已取消导入 | - |
| 481 | success | 导入完成 | {details} |
| 490 | error | 导入失败 | JSON 格式错误 |
| 492 | error | 导入失败 | {errorMsg} |
| 521 | success | 配置已上传到云端 | - |
| 526 | error | 上传失败 | {errorCode} |
| 560 | error | 下载失败 | 云端配置文件内容格式无效 |
| 570 | success | 配置已从云端恢复（覆盖本地） | - |
| 573 | info | 请刷新页面以使配置生效 | - |
| 579 | error | 下载失败 | {errorCode} |
| 608 | error | 下载失败 | 云端配置文件内容格式无效 |
| 623 | success | 配置已从云端恢复（保留本地 WebDAV） | - |
| 626 | info | 请刷新页面以使配置生效 | - |
| 632 | error | 下载失败 | {errorCode} |
| 660 | warn | 没有可上传的历史记录 | - |
| 668 | success | 已强制覆盖云端记录（N 条） | - |
| 673 | error | 上传失败 | {errorCode} |
| 693 | warn | 没有可上传的历史记录 | - |
| 741 | success | 上传完成 | {details} |
| 749 | error | 上传失败 | {errorCode} |
| 769 | warn | 没有可上传的历史记录 | - |
| 798 | info | 无需上传 | 本地没有新增的记录 |
| 809 | success | 上传完成 | {details} |
| 817 | error | 上传失败 | {errorCode} |
| 859 | success | 下载完成 | 共 N 条记录（覆盖本地） |
| 864 | error | 下载失败 | {errorCode} |
| 905 | success | 下载完成 | {details} |
| 913 | error | 下载失败 | {errorCode} |

## useHistoryViewState.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 184 | warn | 未选择项目 | 请先选择要复制的项目 |
| 202 | warn | 无可用链接 | 选中的项目没有可用链接 |
| 214 | success | 复制成功 | 已复制 N 个 {format} 链接 |
| 217 | error | 复制失败 | {error} |
| 234 | warn | 未选择项目 | 请先选择要删除的项目 |

## useHistory.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 205 | error | 加载失败 | {error} |
| 220 | error | 删除失败 | 无效的项目ID |
| 237 | success | 删除成功 | 历史记录已删除 |
| 254 | error | 删除失败 | {errorMsg} |
| 274 | success | 清空成功 | 所有历史记录已清空 |
| 290 | error | 清空失败 | {error} |
| 301 | warn | 无数据 | 没有可导出的历史记录 |
| 317 | success | 导出成功 | 已导出 N 条记录 |
| 321 | error | 导出失败 | {error} |
| 331 | warn | 未选择项目 | 请先选择要复制的项目 |
| 349 | warn | 无可用链接 | 选中的项目没有可用链接 |
| 354 | success | 已复制 | 已复制 N 个链接到剪贴板 |
| 359 | error | 复制失败 | {error} |
| 369 | warn | 未选择项目 | 请先选择要导出的项目 |
| 385 | warn | 无可用数据 | 选中的项目无法加载 |
| 403 | success | 导出成功 | 已导出 N 条记录 |
| 408 | error | 导出失败 | {error} |
| 418 | warn | 未选择项目 | 请先选择要删除的项目 |
| 434 | success | 删除成功 | 已删除 N 条记录 |
| 451 | error | 删除失败 | {error} |
| 568 | error | 跳转失败 | {error} |

## useClipboardImage.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 79 | warn | 粘贴失败 | 无法读取剪贴板图片 |

## UploadView.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 104 | warn | 未配置 | {service} 图床未配置 |
| 152 | info | 请使用 Tauri 文件拖拽 | 文件拖拽功能由 Tauri 提供 |
| 247 | info | 无需重试 | 没有失败的上传项 |
| 269 | success | 已清空 | 上传队列已清空 |
| 275 | success | 已清空 | 已完成的上传项已清理 |

## TimelineView.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 334 | success | 已跳转 | {year}年{month}月 |
| 352 | success | 已跳转 | {year}年 |
| 376 | error | 加载失败 | {error} |
| 384 | success | 已删除 | - |
| 386 | error | 删除失败 | {error} |

## UploadQueue.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 31 | success | 已复制 | 链接已复制到剪贴板 |
| 34 | error | 复制失败 | {error} |

## SettingsView.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 257 | success | 保存成功 | - |
| 260 | error | 保存失败 | {error} |
| 269 | success | 已切换 | 当前主题：亮色/深色 |
| 271 | error | 失败 | {error} |
| 291 | success | 认证成功 | {service} Token 验证成功 |
| 293 | error | 认证失败 | {service} Token 验证失败 |
| 305 | success | 连接成功 | GitHub 仓库访问正常 |
| 307 | error | 连接失败 | GitHub 连接失败 |
| 316 | success | 连接成功 | {service} 配置验证成功 |
| 318 | error | 连接失败 | {service} 连接失败 |
| 357 | success | 测试成功 | {service} Cookie 验证成功 |
| 359 | error | 测试失败 | {error} |
| 368 | info | 京东图床可用/不可用 | - |
| 371 | info | 七鱼图床可用/不可用 | - |
| 447 | success | 连接成功 | WebDAV 服务器连接正常 |
| 449 | error | 连接失败 | WebDAV 服务器连接失败 |
| 452 | error | 连接失败 | {error} |
| 469 | success | 缓存已清理 | 应用缓存已成功清理 |
| 472 | error | 清理失败 | {error} |

## CloudStorageView/index.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 71 | info | 提示 | 拖拽上传暂不支持 |

## HistoryLightbox.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 107 | warn | 无可用链接 | 该项目没有可用的链接 |
| 120 | success | 已复制 | 链接已复制到剪贴板 |
| 123 | error | 复制失败 | {error} |
| 133 | warn | 无可用链接 | 该项目没有可用的链接 |
| 149 | error | 打开失败 | {error} |

## HistoryTableView.vue

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 147 | error | 加载失败 | {error} |
| 237 | warn | 无可用链接 | {service} 图床没有可用的链接 |
| 250 | success | 已复制 | {service} 链接已复制到剪贴板 |
| 253 | error | 复制失败 | {error} |
| 298 | success | 删除成功 | 已删除 1 条记录 |
| 301 | error | 删除失败 | {error} |

## useFileOperations.ts

| 行号 | 类型 | 标题 | 详情 |
|------|------|------|------|
| 121 | success | 上传完成 | 成功上传 N 个文件 |
| 123 | warn | 部分上传失败 | 成功 N 个，失败 N 个 |
| 154 | success | 删除成功 | 已删除 N 项 |
| 156 | warn | 部分删除失败 | 删除 N 项，失败 N 项 |
| 162 | error | 删除失败 | {error} |
| 181 | warn | 暂不支持 | 文件夹重命名功能暂不支持 |
| 188 | info | 提示 | 重命名功能需要先下载再上传 |
| 190 | error | 重命名失败 | {error} |
| 199 | info | 提示 | 移动功能开发中 |
| 206 | warn | 无法复制 | 请选择有效的文件 |
| 219 | success | 已复制 | N 个链接已复制到剪贴板 |
| 221 | error | 复制失败 | 无法访问剪贴板 |
| 231 | info | 提示 | 创建文件夹功能开发中 |
| 237 | warn | 无法下载 | 不支持下载文件夹 |
| 244 | success | 开始下载 | 正在下载 "{name}" |
| 246 | error | 下载失败 | 无法获取下载链接 |
