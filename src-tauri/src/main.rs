// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, Menu, MenuItem, Submenu, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent};
use std::time::Duration;
#[cfg(target_os = "windows")]
use std::{collections::BTreeMap, sync::mpsc};
#[cfg(target_os = "windows")]
use webview2_com::{
    GetCookiesCompletedHandler,
    Microsoft::Web::WebView2::Win32::{ICoreWebView2CookieList, ICoreWebView2_2},
};
#[cfg(target_os = "windows")]
use windows::{
    core::{Interface, PWSTR},
    Win32::System::Com::CoTaskMemFree,
};

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
        .invoke_handler(tauri::generate_handler![
            save_cookie_from_login,
            start_cookie_monitoring,
            get_request_header_cookie
        ])
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

                // 成功后，异步关闭登录窗口
                if let Some(login_window) = app.get_window("login-webview") {
                    let _ = login_window.close();
                    eprintln!("[保存Cookie] ✓ 已请求关闭登录窗口");
                }
                
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

#[tauri::command]
async fn start_cookie_monitoring(app: tauri::AppHandle) -> Result<(), String> {
    eprintln!("[Cookie监控] 开始监控登录窗口的Cookie");
    
    let app_handle = app.clone();
    
    // 在新线程中运行监控
    std::thread::spawn(move || {
        let mut check_count = 0;
        let max_checks = 120; // 最多检查120次（4分钟）
        
        while check_count < max_checks {
            std::thread::sleep(Duration::from_secs(2));
            check_count += 1;
            
            // 获取登录窗口
            if let Some(login_window) = app_handle.get_window("login-webview") {
                #[cfg(target_os = "windows")]
                {
                    if attempt_cookie_capture_and_save(&login_window, &app_handle) {
                        break;
                    }
                }

                #[cfg(not(target_os = "windows"))]
                {
                    // 准备注入的JS，用于检查和发送Cookie
                    let check_js = r#"
                        (async function() {
                            try {
                                const cookie = document.cookie || '';
                                // 微博登录成功的关键Cookie字段
                                if (cookie.includes('SUB=') || cookie.includes('SUBP=')) {
                                    // 调用Tauri后端命令来保存Cookie
                                    await window.__TAURI__.invoke('save_cookie_from_login', { 
                                        cookie: cookie 
                                    });
                                    return true; // 表示成功
                                }
                                return false; // 表示未登录
                            } catch (e) {
                                console.error('[自动监控] JS执行错误:', e);
                                return false;
                            }
                        })()
                    "#;
                    
                    // 执行JS
                    if let Err(e) = login_window.eval(check_js) {
                        eprintln!("[Cookie监控] 执行JS脚本失败: {:?}", e);
                    }
                }
            } else {
                eprintln!("[Cookie监控] 登录窗口已关闭，自动停止监控");
                break; // 窗口关闭，退出循环
            }
        }
        
        eprintln!("[Cookie监控] 监控结束（检查次数: {}）", check_count);
    });
    
    Ok(())
}

#[tauri::command]
async fn get_request_header_cookie(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let Some(login_window) = app.get_window("login-webview") else {
            return Err("登录窗口未打开，请先点击“开始登录”".to_string());
        };

        match try_extract_cookie_header(&login_window) {
            Ok(Some(cookie)) => {
                if cookie.contains("SUB=") && cookie.contains("SUBP=") {
                    eprintln!("[Cookie获取] 请求头Cookie长度: {}", cookie.len());
                    Ok(cookie)
                } else {
                    Err("提取到的 Cookie 缺少关键字段（SUB / SUBP），请确认已成功登录微博"
                        .to_string())
                }
            }
            Ok(None) => Err("未检测到 Cookie，请确认已完成登录后再试".to_string()),
            Err(err) => Err(format!("提取请求头 Cookie 失败: {}", err)),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Err("当前操作系统暂不支持请求头 Cookie 提取，请使用页面内的手动复制方式".to_string())
    }
}

#[cfg(target_os = "windows")]
fn attempt_cookie_capture_and_save(
    login_window: &tauri::Window,
    app_handle: &tauri::AppHandle,
) -> bool {
    match try_extract_cookie_header(login_window) {
        Ok(Some(cookie)) => {
            if cookie.contains("SUB=") && cookie.contains("SUBP=") {
                eprintln!("[Cookie监控] 检测到请求头Cookie，尝试保存");
                match tauri::async_runtime::block_on(save_cookie_from_login(
                    cookie.clone(),
                    app_handle.clone(),
                )) {
                    Ok(_) => {
                        eprintln!("[Cookie监控] ✓ 请求头Cookie保存成功");
                        true
                    }
                    Err(err) => {
                        eprintln!("[Cookie监控] 保存Cookie失败: {}", err);
                        false
                    }
                }
            } else {
                false
            }
        }
        Ok(None) => false,
        Err(err) => {
            eprintln!("[Cookie监控] 读取请求头Cookie失败: {}", err);
            false
        }
    }
}

#[cfg(target_os = "windows")]
fn try_extract_cookie_header(window: &tauri::Window) -> Result<Option<String>, String> {
    let (result_tx, result_rx) = mpsc::channel();
    window
        .with_webview(move |inner| {
            let res = (|| -> Result<Option<String>, String> {
                let controller = inner.controller();
                let webview = unsafe { controller.CoreWebView2() }
                    .map_err(|e| format!("{:?}", e))?;
                let webview2: ICoreWebView2_2 = webview
                    .cast()
                    .map_err(|e| format!("{:?}", e))?;
                let cookie_manager = unsafe { webview2.CookieManager() }
                    .map_err(|e| format!("{:?}", e))?;

                let mut cookie_store: BTreeMap<String, String> = BTreeMap::new();
                let target_urls = [
                    "https://weibo.com/"
                ];

                for url in target_urls {
                    let cm = cookie_manager.clone();
                    let url_string = url.to_string();
                    let url_string_clone = url_string.clone(); // Clone for use in closure
                    let (tx, rx) = mpsc::channel();

                    let result = GetCookiesCompletedHandler::wait_for_async_operation(
                        Box::new(move |handler| unsafe {
                            let wide = encode_wide(&url_string_clone);
                            cm.GetCookies(
                                windows::core::PCWSTR::from_raw(wide.as_ptr()),
                                &handler,
                            )
                            .map_err(webview2_com::Error::WindowsError)
                        }),
                        Box::new(move |hr, list| {
                            hr?;
                            tx.send(list)
                                .expect("send GetCookies result over channel");
                            Ok(())
                        }),
                    );

                    if let Err(err) = result {
                        eprintln!(
                            "[Cookie监控] 获取 {} 请求头Cookie失败: {:?}",
                            url_string, err
                        );
                        continue;
                    }

                    match rx.recv() {
                        Ok(Some(list)) => {
                            if let Err(err) = merge_cookie_list(&mut cookie_store, list)
                            {
                                eprintln!(
                                    "[Cookie监控] 解析 {} Cookie 失败: {}",
                                    url_string, err
                                );
                            }
                        }
                        Ok(None) => continue,
                        Err(_) => {
                            return Err("接收Cookie结果失败".to_string());
                        }
                    }
                }

                if cookie_store.is_empty() {
                    return Ok(None);
                }

                // 调试输出：显示提取到的所有Cookie
                eprintln!("[Cookie调试] 提取到的Cookie键值对: {:?}", cookie_store);

                let header = cookie_store
                    .into_iter()
                    .map(|(k, v)| format!("{k}={v}"))
                    .collect::<Vec<_>>()
                    .join("; ");

                eprintln!("[Cookie调试] 生成的请求头Cookie: {}", header);

                Ok(Some(header))
            })();

            let _ = result_tx.send(res);
        })
        .map_err(|e| e.to_string())?;

    result_rx
        .recv()
        .map_err(|_| "无法获取登录WebView".to_string())?
}

#[cfg(target_os = "windows")]
fn merge_cookie_list(
    store: &mut BTreeMap<String, String>,
    list: ICoreWebView2CookieList,
) -> Result<(), String> {
    unsafe {
        let mut count = 0;
        list.Count(&mut count)
            .map_err(|e| format!("{:?}", e))?;
        for idx in 0..count {
            let cookie = list
                .GetValueAtIndex(idx)
                .map_err(|e| format!("{:?}", e))?;
            let name = read_cookie_string(|ptr| cookie.Name(ptr))?;
            let value = read_cookie_string(|ptr| cookie.Value(ptr))?;
            if name.is_empty() || value.is_empty() {
                continue;
            }
            store.insert(name, value);
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn read_cookie_string<F>(getter: F) -> Result<String, String>
where
    F: FnOnce(&mut PWSTR) -> windows::core::Result<()>,
{
    let mut buffer = PWSTR::null();
    getter(&mut buffer).map_err(|e| format!("{:?}", e))?;
    Ok(pwstr_to_string_and_free(buffer))
}

#[cfg(target_os = "windows")]
fn pwstr_to_string_and_free(pwstr: PWSTR) -> String {
    if pwstr.is_null() {
        return String::new();
    }
    unsafe {
        let mut len = 0;
        while *pwstr.0.add(len) != 0 {
            len += 1;
        }
        let slice = std::slice::from_raw_parts(pwstr.0, len);
        let result = String::from_utf16_lossy(slice);
        CoTaskMemFree(pwstr.0 as _);
        result
    }
}

#[cfg(target_os = "windows")]
fn encode_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

