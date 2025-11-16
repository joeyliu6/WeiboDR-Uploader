// src/history.ts
import { Store } from './store';
import { writeText } from '@tauri-apps/api/clipboard';
import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';
import { getClient, ResponseType, Body } from '@tauri-apps/api/http';
import { HistoryItem, UserConfig, DEFAULT_CONFIG } from './config';

// 使用一个单独的 .dat 文件来存储历史记录
const historyStore = new Store('.history.dat');
const configStore = new Store('.settings.dat');

// DOM 元素
const historyBody = document.getElementById('history-body')!;
const clearHistoryBtn = document.getElementById('clear-history-btn')!;
const exportJsonBtn = document.getElementById('export-json-btn')!;
const syncWebdavBtn = document.getElementById('sync-webdav-btn')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const statusMessageEl = document.getElementById('status-message')!;

// 存储当前显示的所有项目（用于搜索过滤）
let allItems: HistoryItem[] = [];

/**
 * 删除单条历史记录
 */
async function deleteHistoryItem(itemId: string) {
  if (!confirm('您确定要从本地历史记录中删除此条目吗？此操作不会删除已上传到微博的图片。')) {
    return;
  }

  try {
    statusMessageEl.textContent = '删除中...';
    const items = await historyStore.get<HistoryItem[]>('uploads') || [];
    
    // 移除指定 ID 的记录
    const filteredItems = items.filter(item => item.id !== itemId);
    
    await historyStore.set('uploads', filteredItems);
    await historyStore.save();
    
    statusMessageEl.textContent = '已删除。';
    loadHistory(); // 重新加载列表
  } catch (err) {
    statusMessageEl.textContent = `删除失败: ${err}`;
    console.error('删除历史记录失败:', err);
  }
}

/**
 * 迁移旧格式的历史记录到新格式（向后兼容）
 */
function migrateHistoryItem(item: any): HistoryItem {
  // 如果是新格式，直接返回
  if (item.id && item.localFileName && item.generatedLink) {
    return item as HistoryItem;
  }
  
  // 旧格式迁移：fileName -> localFileName, link -> generatedLink
  return {
    id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: item.timestamp || Date.now(),
    localFileName: item.localFileName || item.fileName || '未知文件',
    weiboPid: item.weiboPid || '',
    generatedLink: item.generatedLink || item.link || '',
    r2Key: item.r2Key || null,
  };
}

/**
 * 格式化时间戳为本地时间字符串
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取百度代理预览链接
 */
async function getPreviewUrl(weiboPid: string): Promise<string> {
  try {
    const config = await configStore.get<UserConfig>('config') || DEFAULT_CONFIG;
    const baiduPrefix = config.baiduPrefix || DEFAULT_CONFIG.baiduPrefix;
    // 使用 bmiddle 尺寸
    const bmiddleUrl = `https://tvax1.sinaimg.cn/bmiddle/${weiboPid}.jpg`;
    return baiduPrefix + bmiddleUrl;
  } catch {
    // 如果获取配置失败，使用默认前缀
    const bmiddleUrl = `https://tvax1.sinaimg.cn/bmiddle/${weiboPid}.jpg`;
    return DEFAULT_CONFIG.baiduPrefix + bmiddleUrl;
  }
}

/**
 * 渲染历史记录表格
 */
async function renderHistoryTable(items: HistoryItem[]) {
  // 清空现有内容
  historyBody.innerHTML = '';

  if (items.length === 0) {
    historyBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">暂无历史记录</td></tr>';
    return;
  }

  // 填充表格 (PRD v1.2 - 增强型本地管理)
  for (const item of items) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', item.id);
    tr.setAttribute('data-filename', item.localFileName.toLowerCase()); // 用于搜索

    // 0. 预览图片 (v1.2 新增)
    const tdPreview = document.createElement('td');
    const img = document.createElement('img');
    img.style.width = '50px';
    img.style.height = '50px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '4px';
    img.alt = item.localFileName;
    img.src = await getPreviewUrl(item.weiboPid);
    img.onerror = () => {
      img.style.display = 'none';
    };
    tdPreview.appendChild(img);
    tr.appendChild(tdPreview);

    // 1. 本地文件名
    const tdName = document.createElement('td');
    tdName.textContent = item.localFileName;
    tdName.title = item.localFileName;
    tr.appendChild(tdName);

    // 2. 生成的链接
    const tdLink = document.createElement('td');
    const link = document.createElement('a');
    link.href = item.generatedLink;
    link.target = '_blank';
    link.textContent = item.generatedLink;
    link.title = item.generatedLink;
    link.style.maxWidth = '300px';
    link.style.display = 'inline-block';
    link.style.overflow = 'hidden';
    link.style.textOverflow = 'ellipsis';
    link.style.whiteSpace = 'nowrap';
    tdLink.appendChild(link);
    tr.appendChild(tdLink);

    // 3. 上传时间 (v1.2 新增)
    const tdTime = document.createElement('td');
    tdTime.textContent = formatTimestamp(item.timestamp);
    tdTime.title = formatTimestamp(item.timestamp);
    tr.appendChild(tdTime);

    // 4. 操作 (一键复制按钮)
    const tdAction = document.createElement('td');
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', async () => {
      try {
        await writeText(item.generatedLink);
        copyBtn.textContent = '已复制!';
        setTimeout(() => (copyBtn.textContent = '复制'), 1500);
      } catch (err) {
        copyBtn.textContent = '失败!';
      }
    });
    tdAction.appendChild(copyBtn);
    tr.appendChild(tdAction);

    // 5. 删除按钮
    const tdDelete = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = '删除此记录';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'transparent';
    deleteBtn.style.fontSize = '16px';
    deleteBtn.addEventListener('click', () => {
      deleteHistoryItem(item.id);
    });
    tdDelete.appendChild(deleteBtn);
    tr.appendChild(tdDelete);

    historyBody.appendChild(tr);
  }
}

/**
 * 加载并渲染历史记录
 */
async function loadHistory() {
  let items = await historyStore.get<any[]>('uploads');
  
  if (!items || items.length === 0) {
    allItems = [];
    renderHistoryTable([]);
    return;
  }

  // 迁移旧格式数据
  const migratedItems = items.map(migrateHistoryItem);
  
  // 如果有迁移，保存回存储
  const needsSave = items.some(item => !item.id || !item.localFileName || !item.generatedLink);
  if (needsSave) {
    await historyStore.set('uploads', migratedItems);
    await historyStore.save();
  }

  // 保存所有项目用于搜索
  allItems = migratedItems;
  
  // 应用搜索过滤
  await applySearchFilter();
}

/**
 * 应用搜索过滤
 */
async function applySearchFilter() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  if (!searchTerm) {
    await renderHistoryTable(allItems);
    return;
  }

  const filtered = allItems.filter(item => 
    item.localFileName.toLowerCase().includes(searchTerm)
  );
  
  await renderHistoryTable(filtered);
}

/**
 * 清空历史记录
 */
async function clearHistory() {
  if (!confirm('确定要清空所有上传历史记录吗？此操作不可撤销。')) {
    return;
  }
  try {
    statusMessageEl.textContent = '清空中...';
    await historyStore.clear();
    await historyStore.save();
    statusMessageEl.textContent = '已清空。';
    loadHistory(); // 重新加载以显示空状态
  } catch (err) {
    statusMessageEl.textContent = `清空失败: ${err}`;
  }
}

/**
 * 导出为 JSON 文件 (v1.2 新增)
 */
async function exportToJson() {
  try {
    statusMessageEl.textContent = '准备导出...';
    const items = await historyStore.get<HistoryItem[]>('uploads') || [];
    
    if (items.length === 0) {
      statusMessageEl.textContent = '没有可导出的历史记录。';
      return;
    }

    const jsonContent = JSON.stringify(items, null, 2);
    
    // 弹出保存文件对话框
    const filePath = await save({
      defaultPath: 'weibo_dr_export.json',
      filters: [{
        name: 'JSON',
        extensions: ['json']
      }]
    });

    if (!filePath) {
      statusMessageEl.textContent = '已取消导出。';
      return;
    }

    await writeTextFile(filePath, jsonContent);
    statusMessageEl.textContent = `✅ 已导出 ${items.length} 条记录到 ${filePath}`;
  } catch (err) {
    statusMessageEl.textContent = `导出失败: ${err}`;
    console.error('导出失败:', err);
  }
}

/**
 * 同步到 WebDAV (v1.2 新增)
 */
async function syncToWebDAV() {
  try {
    statusMessageEl.textContent = '同步中...';
    
    const config = await configStore.get<UserConfig>('config');
    if (!config || !config.webdav) {
      statusMessageEl.textContent = '❌ 未配置 WebDAV，请在设置中配置。';
      return;
    }

    const { url, username, password, remotePath } = config.webdav;
    
    if (!url || !username || !password || !remotePath) {
      statusMessageEl.textContent = '❌ WebDAV 配置不完整，请检查设置。';
      return;
    }

    // 获取所有历史记录
    const items = await historyStore.get<HistoryItem[]>('uploads') || [];
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
      statusMessageEl.textContent = `✅ 已同步 ${items.length} 条记录到 WebDAV`;
    } else {
      statusMessageEl.textContent = `❌ 同步失败: HTTP ${response.status}`;
    }
  } catch (err: any) {
    statusMessageEl.textContent = `❌ 同步失败: ${err.message || err}`;
    console.error('WebDAV 同步失败:', err);
  }
}

// 绑定事件
clearHistoryBtn.addEventListener('click', clearHistory);
exportJsonBtn.addEventListener('click', exportToJson);
syncWebdavBtn.addEventListener('click', syncToWebDAV);
searchInput.addEventListener('input', applySearchFilter);

// 初始加载
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
});

