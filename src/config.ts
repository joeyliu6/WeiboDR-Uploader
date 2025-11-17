// src/config.ts
// 共享配置定义

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  path: string;
  publicDomain: string;
}

export interface WebDAVConfig {
  url: string;           // WebDAV URL (例如: https://dav.jianguoyun.com/dav/)
  username: string;      // WebDAV 用户名 (通常是邮箱)
  password: string;     // WebDAV 密码 (通常是应用的授权码)
  remotePath: string;   // 远程路径 (例如: /WeiboDR/history.json)
}

export interface UserConfig {
  weiboCookie: string;
  r2: R2Config;
  baiduPrefix: string;
  outputFormat: 'baidu' | 'weibo' | 'r2';
  webdav: WebDAVConfig; // v1.2 新增
}

export interface HistoryItem {
  id: string;                    // 唯一标识符
  timestamp: number;             // 上传时间
  localFileName: string;         // 原始本地文件名
  weiboPid: string;              // 微博返回的 PID (例如 006G4xsfgy1h8pbgtnqirj)
  generatedLink: string;         // 最终复制到剪贴板的链接
  r2Key: string | null;          // 如果 R2 备份成功，存储 R2 上的 Key；否则为 null
}

export interface FailedItem {
  id: string;                   // 时间戳或UUID
  filePath: string;              // 文件的本地绝对路径
  configSnapshot: UserConfig;    // 失败当时的用户配置
  errorMessage: string;          // 失败原因
}

// 默认配置
export const DEFAULT_CONFIG: UserConfig = {
  weiboCookie: '',
  r2: {
    accountId: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucketName: '',
    path: '',
    publicDomain: '',
  },
  baiduPrefix: 'https://image.baidu.com/search/down?thumburl=',
  outputFormat: 'baidu',
  webdav: {
    url: '',
    username: '',
    password: '',
    remotePath: '/WeiboDR/history.json',
  },
};

