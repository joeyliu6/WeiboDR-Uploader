// src/coreLogic.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeText as writeToClipboard } from "@tauri-apps/api/clipboard";
import { sendNotification, isPermissionGranted, requestPermission } from "@tauri-apps/api/notification";
import { readBinaryFile } from '@tauri-apps/api/fs';
import { getClient, Body } from '@tauri-apps/api/http';
import { uploadToWeibo } from './weiboUploader';
import { UserConfig, R2Config, HistoryItem, FailedItem } from './config';
import { Store } from './store';
import { basename } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/tauri';
import { emit } from '@tauri-apps/api/event';

/**
 * 步骤 B: 备份 R2 (并行, 非阻塞性)
 * @returns {Promise<string | null>} 成功返回 r2Key，失败或未配置返回 null
 * @throws {Error} 非阻塞性错误 "R2 备份失败"
 */
async function backupToR2(
  fileBytes: Uint8Array, // 接受字节流
  hashName: string, 
  config: R2Config
): Promise<string | null> {
  console.log(`[步骤 B] 开始异步备份 ${hashName} 到 R2...`);
  const { accountId, accessKeyId, secretAccessKey, bucketName, path = '' } = config;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.log("[步骤 B] R2 未配置或配置不全，跳过备份。");
    return null; // 如果未配置，返回 null
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const r2Client = new S3Client({
    region: 'auto',
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    }
  });

  const key = (path.endsWith('/') || path === '' ? path : path + '/') + hashName;

  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBytes, // 使用字节流
    }));
    console.log(`[步骤 B] R2 备份成功: ${key}`);
    return key; // 返回 R2 Key
  } catch (error) {
    console.error("[步骤 B] R2 备份失败:", error);
    throw new Error("警告：R2 备份失败，请检查配置。");
  }
}

/**
 * 步骤 C: 生成链接 (并行)
 */
function generateLink(
  weiboLargeUrl: string, 
  hashName: string, 
  config: UserConfig
): string {
  console.log("[步骤 C] 生成最终链接...");
  switch (config.outputFormat) {
    case 'weibo':
      return weiboLargeUrl;
    case 'r2':
      // v2.1: 检查 R2 公开域，如果不存在则回退到微博链接
      const publicDomain = config.r2.publicDomain;
      if (!publicDomain || !publicDomain.trim() || !publicDomain.startsWith('http')) {
        console.warn("警告：R2 公开访问域名未配置或格式不正确，回退到微博链接。");
        sendNotification("R2 链接生成失败！", "请在设置中配置 R2 公开访问域。");
        // 回退到微博链接
        return weiboLargeUrl;
      }
      const domain = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
      const path = config.r2.path || '';
      const key = (path.endsWith('/') || path === '' ? path : path + '/') + hashName;
      return `${domain}/${key}`; 
    case 'baidu':
    default:
      return `${config.baiduPrefix}${weiboLargeUrl}`;
  }
}

/**
 * 弹出系统通知
 */
async function showNotification(title: string, body?: string) {
  if (!(await isPermissionGranted())) {
    await requestPermission();
  }
  sendNotification({ title, body });
}

/**
 * 同步历史记录到 WebDAV (v1.2 新增 - 自动同步)
 * 非阻塞性，失败时只在控制台记录
 */
async function syncHistoryToWebDAV(items: HistoryItem[], config: UserConfig) {
  if (!config.webdav) {
    return; // 未配置 WebDAV，静默跳过
  }

  const { url, username, password, remotePath } = config.webdav;
  
  if (!url || !username || !password || !remotePath) {
    return; // 配置不完整，静默跳过
  }

  try {
    const jsonContent = JSON.stringify(items, null, 2);
    
    // 构建 WebDAV URL
    const webdavUrl = url.endsWith('/') ? url + remotePath.substring(1) : url + remotePath;

    // 使用 Basic Auth
    const auth = btoa(`${username}:${password}`);
    
    const client = await getClient();
    const response = await client.put(webdavUrl, Body.text(jsonContent), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    });

    if (response.ok) {
      console.log(`[WebDAV] 已自动同步 ${items.length} 条记录到 WebDAV`);
    } else {
      console.error(`[WebDAV] 自动同步失败: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("[WebDAV] 自动同步失败:", error);
    // 非阻塞性错误，只在控制台记录
  }
}

/**
 * * * (核心工作流) 处理用户拖拽的文件
 * * */
export async function handleFileUpload(filePath: string, config: UserConfig) {
  
  let fileBytes: Uint8Array;
  try {
    // 新增步骤：从Tauri提供的路径读取文件为字节流
    fileBytes = await readBinaryFile(filePath);
  } catch (readError) {
    console.error("文件读取失败:", readError);
    await showNotification("上传失败", "无法读取文件。");
    return { status: 'error', message: '文件读取失败' };
  }

  try {
    // --- [步骤 A - 上传微博] (串行) ---
    // 使用新的、真实的上传器
    const { hashName, largeUrl } = await uploadToWeibo(
      fileBytes, 
      config.weiboCookie
    );

    // --- 步骤 A 成功后 ---

    // [步骤 C - 生成链接] (并行)
    const finalLink = generateLink(largeUrl, hashName, config);

    // --- [输出] ---
    await writeToClipboard(finalLink);
    await showNotification("上传成功！", "链接已复制到剪贴板。");
    
    // ===============================================
    //           ( ( ( 新增：保存历史记录 ) ) )
    // ===============================================
    try {
      const historyStore = new Store('.history.dat');
      const items = await historyStore.get<HistoryItem[]>('uploads') || [];
      
      // 获取本地文件名
      const name = await basename(filePath);
      
      // 从 hashName 提取 PID (例如: 006G4xsfgy1h8pbgtnqirj.jpg -> 006G4xsfgy1h8pbgtnqirj)
      const weiboPid = hashName.replace(/\.jpg$/, '');
      
      // [步骤 B - 备份R2] (并行 - 异步，但等待结果以保存 r2Key)
      let finalR2Key: string | null = null;
      try {
        finalR2Key = await backupToR2(fileBytes, hashName, config.r2);
      } catch (r2Error: any) {
        // [非阻塞性错误通知]
        showNotification(r2Error.message);
        finalR2Key = null; // 失败时保持为 null
      }
      
      const newItem: HistoryItem = { 
        id: Date.now().toString(), // 使用时间戳作为唯一 ID
        timestamp: Date.now(), 
        localFileName: name,
        weiboPid: weiboPid,
        generatedLink: finalLink,
        r2Key: finalR2Key
      };

      // 添加新记录到最前面，永久保存（不再限制 20 条）
      const newItems = [newItem, ...items];
      
      await historyStore.set('uploads', newItems);
      await historyStore.save();
      console.log("[历史记录] 已保存成功。");

      // [v1.2 新增] 自动同步到 WebDAV (异步，非阻塞)
      syncHistoryToWebDAV(newItems, config)
        .catch(err => {
          console.error("[WebDAV] 自动同步异常:", err);
        });

    } catch (historyError) {
      console.error("[历史记录] 保存失败:", historyError);
      // 这是一个非阻塞性错误，只在控制台记录
    }
    // ===============================================
    //           ( ( ( 历史记录结束 ) ) )
    // ===============================================

    return { status: 'success', link: finalLink };

  } catch (error: any) {
    // --- [阻塞性错误处理] ---
    // 捕获 [步骤 A] 的失败
    console.error("核心流程失败:", error);
    
    const errorMessage = error.message || '未知错误';
    
    // v2.1: Cookie 自动续期逻辑
    if (errorMessage.includes("Cookie")) {
      // 检查是否启用了账号密码自动续期
      if (config.account && config.account.allowUserAccount && 
          config.account.username && config.account.password) {
        console.log("[自动续期] 检测到 Cookie 过期，尝试自动续期...");
        
        try {
          // 调用 Rust 后端登录
          const newCookie = await invoke<string>("attempt_weibo_login", {
            username: config.account.username,
            password: config.account.password
          });
          
          console.log("[自动续期] 登录成功，更新 Cookie...");
          
          // 更新内存中的 Cookie
          config.weiboCookie = newCookie;
          
          // 更新存储中的 Cookie
          const configStore = new Store('.settings.dat');
          const savedConfig = await configStore.get<UserConfig>('config');
          if (savedConfig) {
            savedConfig.weiboCookie = newCookie;
            await configStore.set('config', savedConfig);
            await configStore.save();
          }
          
          // 自动重试上传
          console.log("[自动续期] 使用新 Cookie 重试上传...");
          return await handleFileUpload(filePath, config);
          
        } catch (loginError: any) {
          console.error("[自动续期] 登录失败:", loginError);
          await showNotification(
            "Cookie 已过期，且自动续期失败！", 
            `请检查账号密码或手动更新 Cookie。错误: ${loginError}`
          );
          
          // v2.0 优化：自动导航到设置视图
          await emit('navigate-to', 'settings');
          
          return { status: 'error', message: `Cookie 过期且自动续期失败: ${loginError}` };
        }
      } else {
        // 未启用自动续期，按原样处理
        await showNotification("上传失败", errorMessage);
        return { status: 'error', message: errorMessage };
      }
    }
    
    // v2.1: 失败重试队列逻辑
    // 判断错误类型：可重试 vs 不可重试
    const isRetryable = errorMessage.includes("网络错误") || 
                        errorMessage.includes("超时") || 
                        errorMessage.includes("HTTP 状态码: 5") ||
                        errorMessage.includes("Network Error") ||
                        errorMessage.includes("Failed to fetch");
    
    const isNonRetryable = errorMessage.includes("文件读取失败") || 
                           errorMessage.includes("无法解析响应");
    
    if (isRetryable && !isNonRetryable) {
      // 可重试错误：添加到失败队列
      try {
        const retryStore = new Store('.retry.dat');
        const items = await retryStore.get<FailedItem[]>('failed') || [];
        const name = await basename(filePath);
        
        const newItem: FailedItem = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          filePath: filePath,
          configSnapshot: { ...config }, // 保存配置快照
          errorMessage: errorMessage,
        };
        
        const newItems = [newItem, ...items];
        await retryStore.set('failed', newItems);
        await retryStore.save();
        
        // 发出事件通知侧边栏更新角标
        await emit('update-failed-count', newItems.length);
        
        // 发送非阻塞通知
        await showNotification("文件上传失败", `已将 ${name} 添加到重试队列。`);
        
        return { status: 'failed', message: errorMessage };
      } catch (retryError) {
        console.error("[失败队列] 保存失败项失败:", retryError);
        // 如果保存失败，按原样通知用户
        await showNotification("上传失败", errorMessage);
        return { status: 'error', message: errorMessage };
      }
    } else {
      // 不可重试错误：直接通知用户
      await showNotification("上传失败", errorMessage);
      return { status: 'error', message: errorMessage };
    }
  }
}

