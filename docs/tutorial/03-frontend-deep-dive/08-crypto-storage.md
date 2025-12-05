# 加密存储实现

## 学习目标

通过本节学习，你将能够：
- ✅ 理解为什么需要加密存储
- ✅ 掌握 AES-GCM 加密算法的使用
- ✅ 了解 Web Crypto API 的实际应用
- ✅ 学会系统钥匙串集成（Rust 端）
- ✅ 理解完整的加密/解密流程

## 前置知识

- 了解对称加密和非对称加密的区别
- 熟悉 Base64 编码
- 理解 Promise 和 async/await

---

## 为什么需要加密存储？

### 问题：明文存储的安全风险

**场景**：用户配置包含敏感信息

```json
{
  "weibo": {
    "cookie": "SUB=abc123; SUBP=xyz789"
  },
  "r2": {
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
  }
}
```

**如果明文存储**：
- ❌ 任何人都能查看 Cookie 和 API 密钥
- ❌ 恶意软件可以窃取敏感信息
- ❌ 用户数据安全无法保证

---

### 解决方案：AES-GCM 加密存储

**加密后的数据**：
```
U2FsdGVkX1+abc123def456ghi789jkl...（一堆乱码）
```

**特点**：
- ✅ 即使文件被窃取，没有密钥也无法解密
- ✅ 密钥存储在系统钥匙串（Windows Credential Manager, macOS Keychain, Linux Secret Service）
- ✅ AES-GCM 提供认证加密（既加密又防篡改）

---

## AES-GCM 加密简介

### 什么是 AES-GCM？

**AES** (Advanced Encryption Standard)
- 对称加密算法
- 美国政府标准
- 业界广泛使用

**GCM** (Galois/Counter Mode)
- AES 的一种工作模式
- 提供**认证加密**（AEAD：Authenticated Encryption with Associated Data）
- 同时保证**机密性**和**完整性**

---

### AES-GCM 的工作原理

```
明文 + 密钥 + IV (初始化向量) → AES-GCM 加密 → 密文 + 认证标签
```

**关键参数**：
1. **密钥（Key）** - 256 位（32 字节）随机数据
2. **IV（Initialization Vector）** - 12 字节随机数据（每次加密必须不同）
3. **认证标签（Authentication Tag）** - 16 字节，用于验证数据完整性

**解密**：
```
密文 + 密钥 + IV + 认证标签 → AES-GCM 解密 → 明文
```

**如果数据被篡改**：解密会失败，抛出错误

---

## SecureStorage 类完整解析

### 文件位置

[src/crypto.ts](../../src/crypto.ts)

---

### 类定义

```typescript
/**
 * 安全存储类
 * 使用 AES-GCM 加密算法，密钥由系统钥匙串保护
 */
export class SecureStorage {
  /** 加密密钥（CryptoKey 对象） */
  private key: CryptoKey | null = null;

  // ... 方法实现
}
```

---

### 核心方法 1：init() - 初始化密钥

```typescript
/**
 * 初始化：从 Rust 端获取密钥并导入为 CryptoKey
 * @throws {Error} 如果密钥获取或导入失败
 */
async init(): Promise<void> {
  if (this.key) return;  // 已初始化，直接返回

  try {
    // 【步骤 1】调用 Rust 获取 Base64 格式的密钥
    const keyB64 = await invoke<string>('get_or_create_secure_key');

    // 【步骤 2】Base64 解码为字节数组
    const keyBytes = base64ToBytes(keyB64);

    // 【步骤 3】导入为 Web Crypto API 密钥对象
    this.key = await window.crypto.subtle.importKey(
      "raw",                          // 密钥格式：原始字节
      keyBytes as BufferSource,       // 密钥数据
      { name: "AES-GCM" },            // 算法：AES-GCM
      false,                          // 不可导出
      ["encrypt", "decrypt"]          // 用途：加密和解密
    );

    console.log('[SecureStorage] ✓ 密钥初始化成功');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SecureStorage] 密钥初始化失败:', errorMsg);
    throw new Error(`密钥初始化失败: ${errorMsg}`);
  }
}
```

**工作流程**：
1. **Rust 端生成/获取密钥** - 256 位随机密钥
2. **密钥存储在系统钥匙串** - Windows/macOS/Linux 的安全存储
3. **返回 Base64 编码的密钥** - 通过 Tauri IPC 传递给前端
4. **前端导入为 CryptoKey** - Web Crypto API 的密钥对象

---

### 核心方法 2：encrypt() - 加密数据

```typescript
/**
 * 加密数据
 * @param text 要加密的明文文本
 * @returns Promise<string> Base64 编码的密文（包含 IV + 密文）
 * @throws {Error} 如果加密失败
 */
async encrypt(text: string): Promise<string> {
  if (!this.key) {
    await this.init();  // 确保密钥已初始化
  }

  if (!this.key) {
    throw new Error('加密密钥未初始化');
  }

  try {
    // 【步骤 1】生成随机 IV（12 字节）
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 【步骤 2】将明文转为字节数组
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // 【步骤 3】使用 AES-GCM 加密
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128  // 认证标签长度：128 位（16 字节）
      },
      this.key,
      data
    );

    // 【步骤 4】将 IV 和密文拼接
    const encryptedBytes = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);                     // 前 12 字节：IV
    combined.set(encryptedBytes, iv.length); // 后续字节：密文 + 认证标签

    // 【步骤 5】Base64 编码
    return bytesToBase64(combined);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SecureStorage] 加密失败:', errorMsg);
    throw new Error(`加密失败: ${errorMsg}`);
  }
}
```

**加密流程图**：
```
明文 "SUB=abc123"
    ↓ TextEncoder.encode()
字节数组 [83, 85, 66, 61, ...]
    ↓
生成随机 IV [12, 34, 56, ...]
    ↓
AES-GCM 加密
    ↓
密文 + 认证标签 [78, 90, 12, ...]
    ↓
IV + 密文
    ↓ Base64 编码
"DCI4WJA...OP8="（密文）
```

---

### 核心方法 3：decrypt() - 解密数据

```typescript
/**
 * 解密数据
 * @param encryptedB64 Base64 编码的密文（包含 IV + 密文）
 * @returns Promise<string> 解密后的明文
 * @throws {Error} 如果解密失败（密钥错误或数据被篡改）
 */
async decrypt(encryptedB64: string): Promise<string> {
  if (!this.key) {
    await this.init();  // 确保密钥已初始化
  }

  if (!this.key) {
    throw new Error('解密密钥未初始化');
  }

  try {
    // 【步骤 1】Base64 解码
    const combined = base64ToBytes(encryptedB64);

    // 【步骤 2】分离 IV 和密文
    const iv = combined.slice(0, 12);                    // 前 12 字节：IV
    const encryptedBytes = combined.slice(12);           // 后续字节：密文 + 认证标签

    // 【步骤 3】使用 AES-GCM 解密
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128
      },
      this.key,
      encryptedBytes
    );

    // 【步骤 4】将字节数组转为字符串
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[SecureStorage] 解密失败:', errorMsg);
    throw new Error(`解密失败（密钥错误或数据已损坏）: ${errorMsg}`);
  }
}
```

**解密流程图**：
```
密文 "DCI4WJA...OP8="
    ↓ Base64 解码
IV + 密文 + 认证标签
    ↓ 分离
IV: [12, 34, 56, ...]
密文: [78, 90, 12, ...]
    ↓ AES-GCM 解密（验证认证标签）
字节数组 [83, 85, 66, 61, ...]
    ↓ TextDecoder.decode()
明文 "SUB=abc123"
```

---

## Rust 端：系统钥匙串集成

### 文件位置

[src-tauri/src/commands/secure_key.rs](../../src-tauri/src/commands/secure_key.rs)

---

### 命令实现

```rust
use tauri::command;
use keyring::Entry;
use base64::{Engine as _, engine::general_purpose};

#[tauri::command]
pub fn get_or_create_secure_key() -> Result<String, String> {
    // 【步骤 1】获取系统钥匙串条目
    let entry = Entry::new("WeiboDR-Uploader", "encryption_key")
        .map_err(|e| format!("无法访问系统钥匙串: {}", e))?;

    // 【步骤 2】尝试读取现有密钥
    match entry.get_password() {
        Ok(key_b64) => {
            println!("[SecureKey] 使用现有密钥");
            Ok(key_b64)
        }
        Err(_) => {
            // 【步骤 3】密钥不存在，生成新密钥
            println!("[SecureKey] 生成新密钥");

            // 生成 256 位随机密钥
            let mut key = [0u8; 32];
            getrandom::getrandom(&mut key)
                .map_err(|e| format!("随机数生成失败: {}", e))?;

            // 【步骤 4】Base64 编码
            let key_b64 = general_purpose::STANDARD.encode(&key);

            // 【步骤 5】保存到系统钥匙串
            entry.set_password(&key_b64)
                .map_err(|e| format!("无法保存密钥到系统钥匙串: {}", e))?;

            println!("[SecureKey] ✓ 密钥已生成并保存");
            Ok(key_b64)
        }
    }
}
```

**系统钥匙串位置**：
- **Windows** - Credential Manager（凭据管理器）
- **macOS** - Keychain（钥匙串访问）
- **Linux** - Secret Service（gnome-keyring 或 KWallet）

---

## SimpleStore 类：配置存储

### 文件位置

[src/store.ts](../../src/store.ts)

---

### 核心方法：set() - 保存配置

```typescript
/**
 * 设置数据（加密存储）
 * @param key 键名
 * @param value 值（任意 JSON 可序列化的数据）
 * @throws {StoreError} 如果写入失败
 */
async set(key: string, value: any): Promise<void> {
  // 【步骤 1】序列化为 JSON
  const jsonStr = JSON.stringify(value);

  // 【步骤 2】加密
  const encrypted = await secureStorage.encrypt(jsonStr);

  // 【步骤 3】保存到文件
  await this.writeData({ [key]: encrypted });

  console.log(`[Store] ✓ 已保存并加密: ${key}`);
}
```

**完整流程**：
```
UserConfig 对象
    ↓ JSON.stringify()
JSON 字符串
    ↓ secureStorage.encrypt()
加密后的 Base64 字符串
    ↓ writeTextFile()
保存到文件 config.dat
```

---

### 核心方法：get() - 读取配置

```typescript
/**
 * 获取数据（解密）
 * @param key 键名
 * @returns Promise<any> 解密后的数据，如果不存在则返回 null
 * @throws {StoreError} 如果读取或解密失败
 */
async get(key: string): Promise<any> {
  // 【步骤 1】读取文件
  const allData = await this.readData();

  // 【步骤 2】获取加密数据
  const encrypted = allData[key];
  if (!encrypted) {
    return null;
  }

  // 【步骤 3】解密
  const jsonStr = await secureStorage.decrypt(encrypted);

  // 【步骤 4】解析 JSON
  return JSON.parse(jsonStr);
}
```

**完整流程**：
```
读取文件 config.dat
    ↓
加密后的 Base64 字符串
    ↓ secureStorage.decrypt()
JSON 字符串
    ↓ JSON.parse()
UserConfig 对象
```

---

## 完整加密/解密流程

### 保存配置流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 设置界面
    participant Store as SimpleStore
    participant Crypto as SecureStorage
    participant Rust as Rust 端
    participant Keyring as 系统钥匙串

    User->>UI: 输入微博 Cookie
    UI->>Store: set('userConfig', config)

    Store->>Store: JSON.stringify(config)
    Store->>Crypto: encrypt(jsonStr)

    alt 首次使用
        Crypto->>Rust: invoke('get_or_create_secure_key')
        Rust->>Keyring: 读取密钥
        Keyring-->>Rust: 密钥不存在
        Rust->>Rust: 生成 256 位随机密钥
        Rust->>Keyring: 保存密钥
        Rust-->>Crypto: 返回密钥（Base64）
    else 已有密钥
        Crypto->>Rust: invoke('get_or_create_secure_key')
        Rust->>Keyring: 读取密钥
        Keyring-->>Rust: 返回密钥
        Rust-->>Crypto: 返回密钥（Base64）
    end

    Crypto->>Crypto: 生成随机 IV
    Crypto->>Crypto: AES-GCM 加密
    Crypto-->>Store: 密文（Base64）

    Store->>Store: 写入文件 config.dat
    Store-->>UI: 保存成功
    UI-->>User: 显示"已保存"
```

---

### 读取配置流程

```mermaid
sequenceDiagram
    participant App as 应用启动
    participant Store as SimpleStore
    participant Crypto as SecureStorage
    participant Rust as Rust 端
    participant Keyring as 系统钥匙串

    App->>Store: get('userConfig')
    Store->>Store: 读取文件 config.dat
    Store->>Crypto: decrypt(密文)

    Crypto->>Rust: invoke('get_or_create_secure_key')
    Rust->>Keyring: 读取密钥
    Keyring-->>Rust: 返回密钥
    Rust-->>Crypto: 返回密钥（Base64）

    Crypto->>Crypto: 提取 IV
    Crypto->>Crypto: AES-GCM 解密 + 验证认证标签
    Crypto-->>Store: JSON 字符串

    Store->>Store: JSON.parse()
    Store-->>App: UserConfig 对象
```

---

## 辅助函数

### base64ToBytes() - Base64 解码

```typescript
/**
 * 将 Base64 字符串转为 Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);  // Base64 解码
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
```

---

### bytesToBase64() - Base64 编码

```typescript
/**
 * 将 Uint8Array 转为 Base64 字符串
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);  // Base64 编码
}
```

---

## 安全性分析

### 1. 密钥安全

✅ **密钥存储在系统钥匙串**
- Windows: Credential Manager（需要用户登录密码）
- macOS: Keychain（可设置需要密码解锁）
- Linux: Secret Service（加密存储）

✅ **密钥不存储在代码或配置文件中**
- 即使代码泄露，也无法获取密钥

---

### 2. 数据完整性

✅ **AES-GCM 提供认证加密**
- 如果数据被篡改，解密会失败
- 防止中间人攻击

```typescript
// 如果数据被篡改
try {
  const decrypted = await secureStorage.decrypt(tamperedData);
} catch (error) {
  console.error('数据已被篡改！');  // 解密失败
}
```

---

### 3. IV 随机性

✅ **每次加密使用不同的 IV**
- 相同的明文，每次加密结果都不同
- 防止模式分析攻击

```typescript
const encrypted1 = await secureStorage.encrypt('SUB=abc123');
const encrypted2 = await secureStorage.encrypt('SUB=abc123');
// encrypted1 !== encrypted2（IV 不同）
```

---

## 实战练习

### 练习 1：加密和解密

**任务**：加密一段文本并解密

```typescript
import { secureStorage } from './crypto';

async function testEncryption() {
  // 初始化
  await secureStorage.init();

  // 加密
  const plaintext = 'SUB=abc123; SUBP=xyz789';
  const encrypted = await secureStorage.encrypt(plaintext);
  console.log('密文:', encrypted);

  // 解密
  const decrypted = await secureStorage.decrypt(encrypted);
  console.log('明文:', decrypted);

  // 验证
  console.log('加密/解密成功:', plaintext === decrypted);
}

testEncryption();
```

---

### 练习 2：检测数据篡改

**任务**：修改密文，观察解密失败

```typescript
async function testTampering() {
  await secureStorage.init();

  const plaintext = 'SECRET DATA';
  const encrypted = await secureStorage.encrypt(plaintext);

  // 篡改密文（修改最后一个字符）
  const tampered = encrypted.slice(0, -1) + 'X';

  try {
    await secureStorage.decrypt(tampered);
    console.log('解密成功（不应该发生）');
  } catch (error) {
    console.log('✓ 检测到数据篡改，解密失败');
  }
}

testTampering();
```

---

## 下一步学习

### 已完成（第 3 章完成！）
- ✅ IUploader 接口详解
- ✅ BaseUploader 抽象类
- ✅ UploaderFactory 工厂模式
- ✅ TCLUploader 案例研究
- ✅ MultiServiceUploader 编排器
- ✅ 上传队列管理
- ✅ 配置管理系统
- ✅ 加密存储实现

### 接下来
1. [**第 4 章：后端深入**](../04-backend-deep-dive/01-tauri-main.md)
   - Tauri 主程序详解
   - Rust 命令系统
   - HTTP 客户端管理

---

## 总结

通过本节，你已经：

✅ **理解了加密存储的必要性** - 保护敏感信息安全
✅ **掌握了 AES-GCM 加密** - 认证加密，既加密又防篡改
✅ **学会了 Web Crypto API** - 前端加密/解密实现
✅ **了解了系统钥匙串集成** - Rust 端安全存储密钥
✅ **理解了完整流程** - 从保存到读取的完整加密流程

**关键要点**：
1. **AES-GCM** - 认证加密算法，提供机密性和完整性
2. **系统钥匙串** - 密钥存储在 Windows/macOS/Linux 的安全存储
3. **IV 随机性** - 每次加密使用不同的 IV
4. **Base64 编码** - 密文编码为文本格式方便存储
5. **Web Crypto API** - 浏览器原生加密 API

加密存储让用户数据安全无忧！🔒

---

**🎉 恭喜你完成了第 3 章：前端深入！**

你已经掌握了 WeiboDR-Uploader 前端的所有核心实现！接下来，我们将深入 Rust 后端，了解 Tauri 命令系统和文件上传的底层实现！
