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
        .invoke_handler(tauri::generate_handler![attempt_weibo_login])
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
    let client = reqwest::Client::builder()
        .cookie_store(true)
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

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

    let response = client
        .post("https://passport.weibo.cn/sso/login")
        .header("Referer", "https://passport.weibo.cn/signin/login")
        .header("Origin", "https://passport.weibo.cn")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
        .form(&form_data)
        .send()
        .await
        .map_err(|e| format!("登录请求失败: {}", e))?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("登录请求失败: HTTP {}", status));
    }

    let login_result: LoginResponse = response
        .json()
        .await
        .map_err(|e| format!("解析登录响应失败: {}", e))?;

    // 检查返回码
    if login_result.retcode != 20000000 {
        let error_msg = login_result.msg.unwrap_or_else(|| {
            match login_result.retcode {
                50050011 => "需要验证码".to_string(),
                50011002 => "用户名或密码错误".to_string(),
                _ => format!("登录失败 (错误码: {})", login_result.retcode),
            }
        });
        return Err(error_msg);
    }

    // 第二步：从 loginresulturl 获取 Cookie
    let login_url = login_result.login_result_url.ok_or_else(|| {
        "登录成功但未返回登录结果 URL".to_string()
    })?;

    let cookie_response = client
        .get(&login_url)
        .header("Referer", "https://passport.weibo.cn/signin/login")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("获取 Cookie 失败: {}", e))?;

    // 从响应头中提取所有 Set-Cookie
    let mut cookie_parts = Vec::new();
    for (name, value) in cookie_response.headers() {
        if name.as_str().to_lowercase() == "set-cookie" {
            if let Some(cookie_str) = value.to_str().ok() {
                // Set-Cookie 格式: name=value; path=/; domain=.weibo.cn; HttpOnly
                // 我们只需要 name=value 部分
                if let Some(name_value) = cookie_str.split(';').next() {
                    cookie_parts.push(name_value.trim().to_string());
                }
            }
        }
    }
    
    // 如果响应头中没有 Set-Cookie，返回错误
    if cookie_parts.is_empty() {
        return Err("未能从登录结果 URL 的响应中提取 Cookie。请检查网络连接或稍后重试。".to_string());
    }

    // 拼接所有 Cookie
    let cookie_string = cookie_parts.join("; ");
    Ok(cookie_string)
}

