// src-tauri/src/commands/qiyu.rs
// 七鱼图床上传命令
// 基于网易七鱼客服系统的 NOS 对象存储

use tauri::Window;
use serde::Serialize;
use reqwest::Client;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use std::time::{SystemTime, UNIX_EPOCH};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

#[derive(Debug, Serialize)]
pub struct QiyuUploadResult {
    pub url: String,
    pub size: u64,
}

// 注意：API 响应格式为 {"requestId": "...", "offset": ..., "context": "...", "callbackRetMsg": "..."}
// 我们只需检查 HTTP 200 状态码即可判断上传成功，无需解析响应内容

/// 从 Token 中解析 Object 路径
/// Token 格式: "UPLOAD {AccessKey}:{Signature}:{Base64Policy}"
fn parse_object_path(token: &str) -> Result<String, String> {
    // 验证 Token 格式
    let parts: Vec<&str> = token.split(' ').collect();
    if parts.len() != 2 || parts[0] != "UPLOAD" {
        return Err("无效的 Token 格式，应以 'UPLOAD ' 开头".to_string());
    }

    let token_parts: Vec<&str> = parts[1].split(':').collect();
    if token_parts.len() != 3 {
        return Err("Token 格式错误，缺少必要部分（应为 AccessKey:Signature:Policy）".to_string());
    }

    // 解析 Base64 Policy
    let policy_base64 = token_parts[2];
    let policy_json = BASE64.decode(policy_base64)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;
    let policy_str = String::from_utf8(policy_json)
        .map_err(|e| format!("UTF-8 解码失败: {}", e))?;

    // 解析 JSON 获取 Object
    let policy: serde_json::Value = serde_json::from_str(&policy_str)
        .map_err(|e| format!("JSON 解析失败: {}", e))?;

    policy["Object"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Policy 中缺少 Object 字段".to_string())
}

/// 检查 Token 是否过期
fn check_token_expiry(token: &str) -> Result<(), String> {
    let parts: Vec<&str> = token.split(' ').collect();
    if parts.len() != 2 {
        return Ok(()); // 格式错误由 parse_object_path 处理
    }

    let token_parts: Vec<&str> = parts[1].split(':').collect();
    if token_parts.len() != 3 {
        return Ok(());
    }

    let policy_base64 = token_parts[2];
    if let Ok(policy_json) = BASE64.decode(policy_base64) {
        if let Ok(policy_str) = String::from_utf8(policy_json) {
            if let Ok(policy) = serde_json::from_str::<serde_json::Value>(&policy_str) {
                if let Some(expires) = policy["Expires"].as_i64() {
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64;

                    if expires < now {
                        return Err(format!(
                            "Token 已过期（过期时间: {}）",
                            chrono::DateTime::from_timestamp(expires, 0)
                                .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                                .unwrap_or_else(|| expires.to_string())
                        ));
                    }
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn upload_to_qiyu(
    window: Window,
    id: String,
    file_path: String,
    qiyu_token: String,
) -> Result<QiyuUploadResult, String> {
    println!("[Qiyu] 开始上传文件: {}", file_path);

    // 1. 检查 Token 是否过期
    check_token_expiry(&qiyu_token)?;

    // 2. 解析 Token 获取 Object 路径
    let object_path = parse_object_path(&qiyu_token)?;
    println!("[Qiyu] 解析 Object 路径: {}", object_path);

    // 3. 读取文件
    let mut file = File::open(&file_path).await
        .map_err(|e| format!("无法打开文件: {}", e))?;

    let file_size = file.metadata().await
        .map_err(|e| format!("无法获取文件元数据: {}", e))?
        .len();

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).await
        .map_err(|e| format!("无法读取文件: {}", e))?;

    // 4. 验证文件类型（只允许图片）
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("无法获取文件名")?;

    let ext = file_name.split('.').last()
        .ok_or("无法获取文件扩展名")?
        .to_lowercase();

    // 获取 Content-Type
    let content_type = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => return Err("只支持 JPG、PNG、GIF、WebP 格式的图片".to_string()),
    };

    // 5. 构建上传 URL
    let upload_url = format!(
        "https://cdn-nimup-chunk.qiyukf.net/nim/{}?offset=0&complete=true&version=1.0",
        urlencoding::encode(&object_path)
    );
    println!("[Qiyu] 上传 URL: {}", upload_url);

    // 6. 发送上传请求（直接 POST 二进制数据）
    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let response = client
        .post(&upload_url)
        .header("Content-Type", content_type)
        .header("x-nos-token", &qiyu_token)
        .body(buffer)
        .send()
        .await
        .map_err(|e| format!("上传请求失败: {}", e))?;

    // 7. 检查响应状态
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("上传失败 (HTTP {}): {}", status, body));
    }

    // 8. 记录响应（仅用于调试，不解析 JSON）
    // API 响应格式: {"requestId": "...", "offset": ..., "context": "...", "callbackRetMsg": "..."}
    // HTTP 200 即视为成功
    let response_text = response.text().await
        .map_err(|e| format!("无法读取响应: {}", e))?;
    println!("[Qiyu] API 响应: {}", response_text);

    // 9. 构建 CDN URL (使用当前时间戳作为 createTime)
    let create_time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("无法获取时间戳: {}", e))?
        .as_millis();

    let cdn_url = format!(
        "https://xlx03.cdn.qiyukf.net/{}?createTime={}",
        object_path,
        create_time
    );

    println!("[Qiyu] 上传成功: {}", cdn_url);

    // 10. 发送进度完成事件
    let _ = window.emit("upload://progress", serde_json::json!({
        "id": id,
        "progress": file_size,
        "total": file_size
    }));

    Ok(QiyuUploadResult {
        url: cdn_url,
        size: file_size,
    })
}
