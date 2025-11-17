// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, Menu, MenuItem, Submenu, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent};
use serde::Deserialize;
use std::collections::HashMap;

fn main() {
    // 1. 定义原生菜单栏 (PRD 1.1)
    // "文件" 菜单 (或 "应用" 菜单 on macOS)
    let preferences = CustomMenuItem::new("preferences".to_string(), "偏好设置...")
        .accelerator("CmdOrCtrl+,"); // 快捷键 CmdOrCtrl+,
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    
    let file_menu = if cfg!(target_os = "macos") {
        // macOS 使用 "应用" 菜单
        Submenu::new(
            "WeiboDR-Uploader",
            Menu::new()
                .add_item(preferences)
                .add_native_item(MenuItem::Quit)
        )
    } else {
        // Windows/Linux 使用 "文件" 菜单
        Submenu::new(
            "文件",
            Menu::new()
                .add_item(preferences)
                .add_item(quit)
        )
    };
    
    // "窗口" 菜单
    let history = CustomMenuItem::new("history".to_string(), "上传历史记录")
        .accelerator("CmdOrCtrl+H"); // 快捷键 CmdOrCtrl+H
    let window_menu = Submenu::new(
        "窗口",
        Menu::new()
            .add_item(history)
    );
    
    // 构建完整菜单
    let menu = Menu::new()
        .add_submenu(file_menu)
        .add_submenu(window_menu);
    
    // 2. 定义系统托盘菜单 (PRD 3.3)
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("open_settings", "打开设置"))
        .add_item(CustomMenuItem::new("open_history", "上传历史"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "退出"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![attempt_weibo_login, save_cookie_from_login])
        .menu(menu)                          // 3. 添加原生菜单栏
        .system_tray(system_tray)            // 4. 添加系统托盘
        .on_menu_event(|event| {            // 5. 处理菜单栏事件
            let app = event.window().app_handle();
            let menu_id = event.menu_item_id().to_string();
            eprintln!("菜单事件触发: {}", menu_id); // 调试日志
            
            match event.menu_item_id() {
                "preferences" => {
                    eprintln!("菜单事件触发: 偏好设置");
                    if let Some(main_window) = app.get_window("main") {
                        let _ = main_window.emit("navigate-to", "settings");
                    }
                }
                "history" => {
                    eprintln!("菜单事件触发: 上传历史记录");
                    if let Some(main_window) = app.get_window("main") {
                        let _ = main_window.emit("navigate-to", "history");
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => {
                    eprintln!("未知菜单项: {}", menu_id);
                }
            }
        })
        .on_system_tray_event(|app, event| match event { // 6. 处理托盘事件
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "open_settings" => {
                        eprintln!("托盘事件触发: 打开设置");
                        if let Some(main_window) = app.get_window("main") {
                            let _ = main_window.emit("navigate-to", "settings");
                        }
                    }
                    "open_history" => {
                        eprintln!("托盘事件触发: 上传历史记录");
                        if let Some(main_window) = app.get_window("main") {
                            let _ = main_window.emit("navigate-to", "history");
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Deserialize)]
struct LoginResponse {
    retcode: i32,
    #[serde(rename = "loginresulturl")]
    login_result_url: Option<String>,
    msg: Option<String>,
}

#[tauri::command]
async fn attempt_weibo_login(username: String, password: String) -> Result<String, String> {
    // 输入验证
    if username.trim().is_empty() {
        return Err("用户名不能为空".to_string());
    }
    if password.trim().is_empty() {
        return Err("密码不能为空".to_string());
    }
    
    eprintln!("[登录] 开始尝试登录，用户名: {}", username);
    
    let client = reqwest::Client::builder()
        .cookie_store(true)
        .timeout(std::time::Duration::from_secs(30)) // 30秒超时
        .build()
        .map_err(|e| {
            eprintln!("[登录] 创建 HTTP 客户端失败: {:?}", e);
            format!("创建 HTTP 客户端失败: {}", e)
        })?;

    // 第一步：POST 登录请求
    let mut form_data: HashMap<String, String> = HashMap::new();
    form_data.insert("username".to_string(), username);
    form_data.insert("password".to_string(), password);
    form_data.insert("entry".to_string(), "mweibo".to_string());
    form_data.insert("savestate".to_string(), "1".to_string());
    form_data.insert("ec".to_string(), "0".to_string());
    form_data.insert("pagerefer".to_string(), "".to_string());
    form_data.insert("r".to_string(), "https://m.weibo.cn/".to_string());
    form_data.insert("wentry".to_string(), "".to_string());
    form_data.insert("loginfrom".to_string(), "".to_string());
    form_data.insert("client_id".to_string(), "".to_string());
    form_data.insert("code".to_string(), "".to_string());
    form_data.insert("qq".to_string(), "".to_string());
    form_data.insert("mainpageflag".to_string(), "1".to_string());
    form_data.insert("hff".to_string(), "".to_string());
    form_data.insert("hfp".to_string(), "".to_string());

    eprintln!("[登录] 发送登录请求到微博服务器...");
    
    let response = client
        .post("https://passport.weibo.cn/sso/login")
        .header("Referer", "https://passport.weibo.cn/signin/login")
        .header("Origin", "https://passport.weibo.cn")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
        .form(&form_data)
        .send()
        .await
        .map_err(|e| {
            eprintln!("[登录] 登录请求失败: {:?}", e);
            let error_msg = e.to_string().to_lowercase();
            if error_msg.contains("timeout") || error_msg.contains("超时") {
                "登录请求超时：请检查网络连接".to_string()
            } else if error_msg.contains("connection") || error_msg.contains("连接") {
                "无法连接到微博服务器：请检查网络连接和防火墙设置".to_string()
            } else {
                format!("登录请求失败: {}", e)
            }
        })?;

    let status = response.status();
    eprintln!("[登录] 收到响应，状态码: {}", status);
    
    if !status.is_success() {
        let error_msg = match status.as_u16() {
            400 => "请求参数错误".to_string(),
            403 => "访问被拒绝：可能触发了安全验证".to_string(),
            429 => "请求过于频繁：请稍后再试".to_string(),
            500..=599 => format!("服务器错误 (HTTP {})：微博服务器可能暂时不可用", status),
            _ => format!("登录请求失败: HTTP {}", status),
        };
        return Err(error_msg);
    }

    let login_result: LoginResponse = response
        .json()
        .await
        .map_err(|e| {
            eprintln!("[登录] 解析登录响应失败: {:?}", e);
            format!("解析登录响应失败: {}。服务器可能返回了异常数据", e)
        })?;
    
    eprintln!("[登录] 登录响应解析成功，retcode: {}", login_result.retcode);

    // 检查返回码
    if login_result.retcode != 20000000 {
        let error_msg = login_result.msg.clone().unwrap_or_else(|| {
            match login_result.retcode {
                50050011 => "需要验证码：请稍后再试或使用其他登录方式".to_string(),
                50011002 => "用户名或密码错误：请检查您的账号密码".to_string(),
                50011003 => "账号异常：请前往微博官网解除限制".to_string(),
                50011015 => "账号已被锁定：请联系微博客服".to_string(),
                _ => format!("登录失败 (错误码: {})", login_result.retcode),
            }
        });
        eprintln!("[登录] 登录失败: {} (retcode: {})", error_msg, login_result.retcode);
        return Err(error_msg);
    }

    // 第二步：从 loginresulturl 获取 Cookie
    let login_url = login_result.login_result_url.ok_or_else(|| {
        eprintln!("[登录] 登录成功但未返回登录结果 URL");
        "登录成功但未返回登录结果 URL：这可能是微博 API 变更，请联系开发者".to_string()
    })?;
    
    eprintln!("[登录] 准备从登录结果 URL 获取 Cookie: {}", login_url);

    let cookie_response = client
        .get(&login_url)
        .header("Referer", "https://passport.weibo.cn/signin/login")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| {
            eprintln!("[登录] 获取 Cookie 失败: {:?}", e);
            let error_msg = e.to_string().to_lowercase();
            if error_msg.contains("timeout") || error_msg.contains("超时") {
                "获取 Cookie 超时：请检查网络连接".to_string()
            } else if error_msg.contains("connection") || error_msg.contains("连接") {
                "无法连接到服务器：请检查网络连接".to_string()
            } else {
                format!("获取 Cookie 失败: {}", e)
            }
        })?;
    
    eprintln!("[登录] Cookie 响应状态码: {}", cookie_response.status());

    // 从响应头中提取所有 Set-Cookie
    let mut cookie_parts = Vec::new();
    let mut cookie_count = 0;
    
    for (name, value) in cookie_response.headers() {
        if name.as_str().to_lowercase() == "set-cookie" {
            cookie_count += 1;
            if let Ok(cookie_str) = value.to_str() {
                // Set-Cookie 格式: name=value; path=/; domain=.weibo.cn; HttpOnly
                // 我们只需要 name=value 部分
                if let Some(name_value) = cookie_str.split(';').next() {
                    let trimmed = name_value.trim();
                    if !trimmed.is_empty() {
                        cookie_parts.push(trimmed.to_string());
                        eprintln!("[登录] 提取 Cookie: {}", trimmed.split('=').next().unwrap_or("unknown"));
                    }
                }
            }
        }
    }
    
    eprintln!("[登录] 共找到 {} 个 Set-Cookie 头，成功提取 {} 个 Cookie", cookie_count, cookie_parts.len());
    
    // 如果响应头中没有 Set-Cookie，返回错误
    if cookie_parts.is_empty() {
        eprintln!("[登录] 错误: 未能从响应中提取任何 Cookie");
        return Err("未能从登录结果中提取 Cookie：这可能是微博 API 变更或网络问题，请稍后重试或手动获取 Cookie。".to_string());
    }

    // 拼接所有 Cookie
    let cookie_string = cookie_parts.join("; ");
    eprintln!("[登录] ✓ Cookie 提取成功，长度: {} 字符", cookie_string.len());
    
    Ok(cookie_string)
}

#[tauri::command]
async fn save_cookie_from_login(cookie: String, app: tauri::AppHandle) -> Result<(), String> {
    eprintln!("[保存Cookie] 开始保存Cookie，长度: {}", cookie.len());
    
    // 输入验证
    if cookie.trim().is_empty() {
        return Err("Cookie不能为空".to_string());
    }
    
    // 发送事件到主窗口
    if let Some(main_window) = app.get_window("main") {
        match main_window.emit("cookie-updated", cookie.clone()) {
            Ok(_) => {
                eprintln!("[保存Cookie] ✓ 已发送Cookie到主窗口");
                Ok(())
            }
            Err(e) => {
                eprintln!("[保存Cookie] 发送事件失败: {:?}", e);
                Err(format!("发送Cookie事件失败: {}", e))
            }
        }
    } else {
        eprintln!("[保存Cookie] 错误: 找不到主窗口");
        Err("找不到主窗口".to_string())
    }
}

