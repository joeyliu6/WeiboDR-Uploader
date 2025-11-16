// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri::{CustomMenuItem, Manager, Menu, MenuItem, Submenu, SystemTray, SystemTrayMenu, SystemTrayMenuItem, SystemTrayEvent};

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

