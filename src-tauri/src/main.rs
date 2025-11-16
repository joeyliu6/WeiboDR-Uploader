// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, Menu, MenuItem, Submenu, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent, WindowUrl};

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
    let close_window = CustomMenuItem::new("close_window".to_string(), "关闭窗口")
        .accelerator("CmdOrCtrl+W"); // 快捷键 CmdOrCtrl+W
    
    let window_menu = Submenu::new(
        "窗口",
        Menu::new()
            .add_item(history)
            .add_item(close_window)
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
        .menu(menu)                          // 3. 添加原生菜单栏
        .system_tray(system_tray)            // 4. 添加系统托盘
        .on_menu_event(|event| {            // 5. 处理菜单栏事件
            let app = event.window().app_handle();
            let menu_id = event.menu_item_id().to_string();
            eprintln!("菜单事件触发: {}", menu_id); // 调试日志
            
            match event.menu_item_id() {
                "preferences" => {
                    eprintln!("尝试打开设置窗口");
                    let app_handle = app.clone();
                    // 如果窗口不存在，创建它；如果存在，显示它
                    if let Some(window) = app.get_window("settings") {
                        if let Err(e) = window.show() {
                            eprintln!("显示设置窗口失败: {:?}", e);
                        }
                        if let Err(e) = window.set_focus() {
                            eprintln!("设置窗口焦点失败: {:?}", e);
                        }
                    } else {
                        eprintln!("设置窗口不存在，尝试创建...");
                        // 动态创建窗口
                        match tauri::WindowBuilder::new(
                            &app_handle,
                            "settings",
                            WindowUrl::App("/src/settings.html".into())
                        )
                        .title("设置")
                        .inner_size(600.0, 750.0)
                        .resizable(true)
                        .always_on_top(true)
                        .visible(false)
                        .build() {
                            Ok(window) => {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            Err(e) => {
                                eprintln!("创建设置窗口失败: {:?}", e);
                            }
                        }
                    }
                }
                "history" => {
                    eprintln!("尝试打开历史记录窗口");
                    let app_handle = app.clone();
                    // 如果窗口不存在，创建它；如果存在，显示它
                    if let Some(window) = app.get_window("history") {
                        if let Err(e) = window.show() {
                            eprintln!("显示历史记录窗口失败: {:?}", e);
                        }
                        if let Err(e) = window.set_focus() {
                            eprintln!("设置历史记录窗口焦点失败: {:?}", e);
                        }
                    } else {
                        eprintln!("历史记录窗口不存在，尝试创建...");
                        // 动态创建窗口
                        match tauri::WindowBuilder::new(
                            &app_handle,
                            "history",
                            WindowUrl::App("/src/history.html".into())
                        )
                        .title("上传历史记录")
                        .inner_size(700.0, 500.0)
                        .resizable(true)
                        .always_on_top(false)
                        .visible(false)
                        .build() {
                            Ok(window) => {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            Err(e) => {
                                eprintln!("创建历史记录窗口失败: {:?}", e);
                            }
                        }
                    }
                }
                "close_window" => {
                    if let Some(window) = app.get_focused_window() {
                        let _ = window.close();
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
                        // 获取 "settings" 窗口句柄，如果不存在则创建
                        if let Some(window) = app.get_window("settings") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            // 动态创建窗口
                            let app_handle = app.clone();
                            if let Ok(window) = tauri::WindowBuilder::new(
                                &app_handle,
                                "settings",
                                WindowUrl::App("/src/settings.html".into())
                            )
                            .title("设置")
                            .inner_size(600.0, 750.0)
                            .resizable(true)
                            .always_on_top(true)
                            .visible(false)
                            .build() {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    "open_history" => {
                        if let Some(window) = app.get_window("history") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        } else {
                            // 动态创建窗口
                            let app_handle = app.clone();
                            if let Ok(window) = tauri::WindowBuilder::new(
                                &app_handle,
                                "history",
                                WindowUrl::App("/src/history.html".into())
                            )
                            .title("上传历史记录")
                            .inner_size(700.0, 500.0)
                            .resizable(true)
                            .always_on_top(false)
                            .visible(false)
                            .build() {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
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

