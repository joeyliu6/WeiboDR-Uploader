// src/login.ts
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from '@tauri-apps/api/window';

// DOM元素
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const usernameInput = document.getElementById('username') as HTMLInputElement;
const passwordInput = document.getElementById('password') as HTMLInputElement;
const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const statusMessage = document.getElementById('status-message') as HTMLDivElement;
const togglePasswordBtn = document.getElementById('toggle-password') as HTMLButtonElement;

// 密码显示/隐藏切换
togglePasswordBtn.addEventListener('click', () => {
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    togglePasswordBtn.textContent = '隐藏';
  } else {
    passwordInput.type = 'password';
    togglePasswordBtn.textContent = '显示';
  }
});

// 显示状态消息
function showMessage(message: string, type: 'success' | 'error' | 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
}

// 登录表单提交
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  
  // 输入验证
  if (!username) {
    showMessage('请输入用户名', 'error');
    usernameInput.focus();
    return;
  }
  
  if (!password) {
    showMessage('请输入密码', 'error');
    passwordInput.focus();
    return;
  }
  
  // 禁用表单
  loginBtn.disabled = true;
  usernameInput.disabled = true;
  passwordInput.disabled = true;
  cancelBtn.disabled = true;
  
  // 显示加载状态
  const originalBtnText = loginBtn.innerHTML;
  loginBtn.innerHTML = '<span class="loading-spinner"></span> 登录中...';
  showMessage('正在连接微博服务器...', 'info');
  
  try {
    console.log('[登录] 开始调用后端登录接口');
    
    // 调用Rust后端登录
    const cookie = await invoke<string>('attempt_weibo_login', {
      username,
      password
    });
    
    console.log('[登录] 登录成功，Cookie长度:', cookie?.length || 0);
    
    if (!cookie || cookie.trim().length === 0) {
      throw new Error('登录返回的Cookie为空');
    }
    
    // 显示成功消息
    showMessage('✅ 登录成功！正在保存Cookie...', 'success');
    
    // 发送Cookie到主窗口
    try {
      await invoke('save_cookie_from_login', { cookie: cookie.trim() });
      console.log('[登录] Cookie已保存');
      
      showMessage('✅ Cookie已保存！窗口将在2秒后关闭...', 'success');
      
      // 2秒后关闭窗口
      setTimeout(async () => {
        try {
          await appWindow.close();
        } catch (err) {
          console.error('[登录] 关闭窗口失败:', err);
        }
      }, 2000);
      
    } catch (saveError) {
      console.error('[登录] 保存Cookie失败:', saveError);
      throw new Error('Cookie保存失败，请稍后重试');
    }
    
  } catch (error: any) {
    console.error('[登录] 登录失败:', error);
    
    let errorMessage = '登录失败';
    
    if (error && typeof error === 'string') {
      errorMessage = error;
    } else if (error && error.message) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      errorMessage = String(error);
    }
    
    // 显示友好的错误消息
    showMessage(`❌ ${errorMessage}`, 'error');
    
    // 恢复表单
    loginBtn.disabled = false;
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    cancelBtn.disabled = false;
    loginBtn.innerHTML = originalBtnText;
    
    // 焦点回到密码框
    passwordInput.select();
  }
});

// 取消按钮
cancelBtn.addEventListener('click', async () => {
  try {
    await appWindow.close();
  } catch (err) {
    console.error('[登录] 关闭窗口失败:', err);
  }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cancelBtn.click();
  }
});

// 页面加载完成
console.log('[登录] 登录窗口已加载');
