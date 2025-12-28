// src-tauri/src/commands/utils.rs
// 通用工具函数

use tokio::fs::File;
use tokio::io::AsyncReadExt;

use crate::error::AppError;

/// 读取文件到字节数组
///
/// # 参数
/// - `path`: 文件路径
///
/// # 返回
/// - `Ok((Vec<u8>, u64))`: 文件内容和文件大小
/// - `Err(AppError)`: 文件 IO 错误
pub async fn read_file_bytes(path: &str) -> Result<(Vec<u8>, u64), AppError> {
    let mut file = File::open(path)
        .await
        .map_err(|e| AppError::file_io(format!("无法打开文件: {}", e)))?;

    let file_size = file
        .metadata()
        .await
        .map_err(|e| AppError::file_io(format!("无法获取文件元数据: {}", e)))?
        .len();

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .await
        .map_err(|e| AppError::file_io(format!("无法读取文件: {}", e)))?;

    Ok((buffer, file_size))
}
