// src/login-webview.ts
import { appWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/tauri';

// DOM元素
const getCookieBtn = document.getElementById('get-cookie-btn') as HTMLButtonElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const statusMessage = document.getElementById('status-message') as HTMLDivElement;
const startLoginBtn = document.getElementById('start-login-btn') as HTMLButtonElement;
const instructionsDiv = document.getElementById('instructions') as HTMLDivElement;
const tipsSection = document.getElementById('tips-section') as HTMLDivElement;


// 显示状态消息
function showStatus(message: string, type: 'normal' | 'success' | 'error' = 'normal') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

async function fetchRequestHeaderCookie(): Promise<string | null> {
  try {
    console.log('[手动获取] 开始调用后端请求头Cookie提取');
    const cookie = await invoke<string>('get_request_header_cookie');
    console.log('[手动获取] 后端返回的Cookie长度:', cookie?.length || 0);
    if (cookie && cookie.trim().length > 0) {
      console.log('[手动获取] 成功获取请求头Cookie');
      return cookie.trim();
    }
  } catch (error) {
    console.error('[手动获取] 请求头Cookie提取失败:', error);
  }
  return null;
}

// 开始登录按钮
startLoginBtn.addEventListener('click', async () => {
  console.log('[自动登录] 开始加载微博登录页面');
  
  // 隐藏说明，显示提示
  instructionsDiv.style.display = 'none';
  tipsSection.innerHTML = `
    <strong>💡 登录中：</strong>
    页面正在加载微博登录页面，登录成功后会自动检测并获取Cookie...
  `;
  
  showStatus('正在加载微博登录页面...', 'normal');
  
  try {
    // 启动后端Cookie监控
    await invoke('start_cookie_monitoring');
    console.log('[自动登录] 已启动后端Cookie监控');
  } catch (error) {
    console.error('[自动登录] 启动监控失败:', error);
  }
  
  // 跳转到微博登录页面
  window.location.href = 'https://m.weibo.cn/';
});


// 手动获取Cookie按钮（备用）
getCookieBtn.addEventListener('click', async () => {
  try {
    getCookieBtn.disabled = true;
    showStatus('🔎 正在尝试读取请求头Cookie...', 'normal');

    let cookie = await fetchRequestHeaderCookie();
    let cookieSource: 'header' | 'document' = 'header';

    if (!cookie) {
      showStatus('⚠️ 未检测到请求头Cookie，尝试页面Cookie...', 'normal');
      const docCookie = document.cookie;
      if (docCookie && docCookie.trim().length > 0) {
        cookie = docCookie.trim();
        cookieSource = 'document';
      }
    }

    if (!cookie) {
      showStatus('❌ 未检测到Cookie，请确保已登录', 'error');
      getCookieBtn.disabled = false;
      return;
    }

    console.log(`[手动获取] 使用${cookieSource === 'header' ? '请求头' : '页面'}Cookie，长度:`, cookie.length);
    showStatus('✅ 正在保存Cookie...', 'success');
    
    // 调用后端保存
    await invoke('save_cookie_from_login', { cookie: cookie.trim() });
    
    console.log('[手动获取] Cookie已保存');
    showStatus('✅ Cookie保存成功！窗口将在2秒后关闭...', 'success');
    
    // 2秒后关闭窗口
    setTimeout(async () => {
      try {
        await appWindow.close();
      } catch (err) {
        console.error('[手动获取] 关闭窗口失败:', err);
      }
    }, 2000);
    
  } catch (error: any) {
    console.error('[手动获取] 获取Cookie失败:', error);
    showStatus(`❌ 获取失败: ${error.message || error}`, 'error');
    getCookieBtn.disabled = false;
  }
});

// 关闭按钮
closeBtn.addEventListener('click', async () => {
  try {
    await appWindow.close();
  } catch (err) {
    console.error('[登录窗口] 关闭窗口失败:', err);
  }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeBtn.click();
  }
});

console.log('[登录窗口] 页面已初始化');

