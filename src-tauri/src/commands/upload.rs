use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};
use crate::error::AppError;
use serde::Serialize;
use reqwest::header;
use std::path::Path;

#[derive(Serialize)]
pub struct UploadResponse {
    pub pid: String,
    pub width: i32,
    pub height: i32,
    pub size: i32,
}

fn parse_weibo_response(xml: &str) -> Result<UploadResponse, AppError> {
    if xml.contains("<data>100006</data>") {
         return Err(AppError::AuthError("Cookie expired (code 100006)".to_string()));
    }
    
    let pid = xml.find("<pid>").and_then(|start| {
        xml.find("</pid>").map(|end| &xml[start+5..end])
    }).ok_or_else(|| AppError::WeiboApiError { code: -1, msg: "Failed to parse PID".to_string() })?;

    let width = xml.find("<width>").and_then(|start| {
        xml.find("</width>").map(|end| &xml[start+7..end])
    }).and_then(|s| s.parse().ok()).unwrap_or(0);

    let height = xml.find("<height>").and_then(|start| {
        xml.find("</height>").map(|end| &xml[start+8..end])
    }).and_then(|s| s.parse().ok()).unwrap_or(0);

    let size = xml.find("<size>").and_then(|start| {
        xml.find("</size>").map(|end| &xml[start+6..end])
    }).and_then(|s| s.parse().ok()).unwrap_or(0);

    Ok(UploadResponse {
        pid: pid.to_string(),
        width,
        height,
        size,
    })
}

#[tauri::command]
pub async fn upload_file_stream(
    file_path: String, 
    weibo_cookie: String
) -> Result<UploadResponse, AppError> {
    
    let path = Path::new(&file_path);
    // Unused variable file_name
    let _file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("image.jpg");
    
    let file = File::open(&file_path).await?;
    let metadata = file.metadata().await?;
    let len = metadata.len();

    let stream = FramedRead::new(file, BytesCodec::new());
    let body = reqwest::Body::wrap_stream(stream);

    let url = "https://picupload.weibo.com/interface/pic_upload.php?s=xml&ori=1&data=1&rotate=0&wm=&app=miniblog&mime=image/jpeg";

    let client = reqwest::Client::new();
    let res = client.post(url)
        .header(header::COOKIE, weibo_cookie)
        .header(header::CONTENT_LENGTH, len)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .header(header::REFERER, "https://photo.weibo.com/")
        .header(header::ORIGIN, "https://photo.weibo.com")
        .header(header::USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
        .body(body)
        .send()
        .await?;

    let text = res.text().await?;
    
    parse_weibo_response(&text)
}

