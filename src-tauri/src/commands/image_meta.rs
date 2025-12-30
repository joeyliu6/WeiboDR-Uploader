// src-tauri/src/commands/image_meta.rs
// 图片元数据提取命令

use std::fs;
use std::path::Path;

use image::GenericImageView;
use serde::Serialize;

use crate::error::AppError;

/// 图片元数据结构
/// 用于前端 Justified Layout 布局和历史记录存储
#[derive(Serialize)]
pub struct ImageMetadata {
    /// 图片宽度（像素）
    pub width: u32,
    /// 图片高度（像素）
    pub height: u32,
    /// 宽高比（width / height）
    pub aspect_ratio: f64,
    /// 文件大小（字节）
    pub file_size: u64,
    /// 图片格式（jpg, png, webp, gif, bmp 等）
    pub format: String,
    /// 颜色类型（rgb, rgba, gray 等）
    pub color_type: String,
    /// 是否包含 Alpha 通道
    pub has_alpha: bool,
}

/// 获取图片元数据
///
/// # 参数
/// - `file_path`: 图片文件的绝对路径
///
/// # 返回
/// - `Ok(ImageMetadata)`: 图片元数据
/// - `Err(AppError)`: 文件读取或图片解析错误
#[tauri::command]
pub fn get_image_metadata(file_path: String) -> Result<ImageMetadata, AppError> {
    let path = Path::new(&file_path);

    // 1. 检查文件是否存在
    if !path.exists() {
        return Err(AppError::file_io(format!("文件不存在: {}", file_path)));
    }

    // 2. 获取文件大小
    let file_size = fs::metadata(path)
        .map_err(|e| AppError::file_io(format!("读取文件元数据失败: {}", e)))?
        .len();

    // 3. 从文件扩展名推断格式
    let format = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_else(|| "unknown".to_string());

    // 4. 使用 image crate 读取图片信息
    let img = image::open(path).map_err(|e| {
        let error_msg = e.to_string();
        if error_msg.contains("unsupported") || error_msg.contains("format") {
            AppError::validation(format!("不支持的图片格式: {}", format))
        } else if error_msg.contains("corrupt") || error_msg.contains("invalid") {
            AppError::validation("图片文件已损坏或格式无效")
        } else {
            AppError::file_io(format!("无法读取图片: {}", e))
        }
    })?;

    // 5. 提取图片尺寸
    let (width, height) = img.dimensions();

    // 6. 计算宽高比（避免除以零）
    let aspect_ratio = if height > 0 {
        width as f64 / height as f64
    } else {
        1.0
    };

    // 7. 获取颜色类型
    let color = img.color();
    let (color_type, has_alpha) = match color {
        image::ColorType::L8 => ("l".to_string(), false),
        image::ColorType::La8 => ("la".to_string(), true),
        image::ColorType::Rgb8 => ("rgb".to_string(), false),
        image::ColorType::Rgba8 => ("rgba".to_string(), true),
        image::ColorType::L16 => ("l16".to_string(), false),
        image::ColorType::La16 => ("la16".to_string(), true),
        image::ColorType::Rgb16 => ("rgb16".to_string(), false),
        image::ColorType::Rgba16 => ("rgba16".to_string(), true),
        image::ColorType::Rgb32F => ("rgb32f".to_string(), false),
        image::ColorType::Rgba32F => ("rgba32f".to_string(), true),
        _ => ("unknown".to_string(), false),
    };

    Ok(ImageMetadata {
        width,
        height,
        aspect_ratio,
        file_size,
        format,
        color_type,
        has_alpha,
    })
}
