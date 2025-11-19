use serde::Serialize;

#[derive(Debug, Serialize)]
pub enum AppError {
    #[serde(rename = "ERR_NETWORK")]
    NetworkError(String),
    
    #[serde(rename = "ERR_AUTH")]
    AuthError(String),
    
    #[serde(rename = "ERR_FILE_IO")]
    FileIoError(String),
    
    #[serde(rename = "ERR_WEIBO_API")]
    WeiboApiError { code: i32, msg: String },
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        AppError::NetworkError(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::FileIoError(err.to_string())
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::NetworkError(msg) => write!(f, "Network Error: {}", msg),
            AppError::AuthError(msg) => write!(f, "Auth Error: {}", msg),
            AppError::FileIoError(msg) => write!(f, "File IO Error: {}", msg),
            AppError::WeiboApiError { code, msg } => write!(f, "Weibo API Error {}: {}", code, msg),
        }
    }
}

impl std::error::Error for AppError {}

