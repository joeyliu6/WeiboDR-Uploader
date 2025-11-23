// src/crypto.ts
// 加密存储工具类，使用 Web Crypto API 进行 AES-GCM 加密
import { invoke } from '@tauri-apps/api/tauri';

/**
 * 将 Base64 字符串转为 Uint8Array
 * @param base64 Base64 编码的字符串
 * @returns Uint8Array 字节数组
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * 将 Uint8Array 转为 Base64 字符串
 * @param bytes 字节数组
 * @returns Base64 编码的字符串
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 安全存储类
 * 使用 AES-GCM 加密算法，密钥由系统钥匙串保护
 */
export class SecureStorage {
  private key: CryptoKey | null = null;

  /**
   * 初始化：从 Rust 端获取密钥并导入为 CryptoKey
   * @throws {Error} 如果密钥获取或导入失败
   */
  async init(): Promise<void> {
    if (this.key) return;
    
    try {
      // 调用 Rust 获取 Base64 格式的密钥
      const keyB64 = await invoke<string>('get_or_create_secure_key');
      const keyBytes = base64ToBytes(keyB64);

      // 导入为 Web Crypto API 密钥对象
      this.key = await window.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
      
      console.log('[SecureStorage] ✓ 密钥初始化成功');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[SecureStorage] 密钥初始化失败:', errorMsg);
      throw new Error(`密钥初始化失败: ${errorMsg}`);
    }
  }

  /**
   * 加密数据
   * @param text 要加密的明文文本
   * @returns Promise<string> Base64 编码的密文（包含 IV + 密文）
   * @throws {Error} 如果加密失败
   */
  async encrypt(text: string): Promise<string> {
    if (!this.key) {
      await this.init();
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      
      // 生成随机 IV (初始化向量)，每次加密都必须不同
      // AES-GCM 推荐使用 12 字节的 IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        this.key!,
        data
      );

      // 返回格式：IV + 密文 的 Base64 组合
      // 我们需要把 IV 和密文拼在一起存储，解密时再拆开
      const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedContent), iv.length);

      return bytesToBase64(combined);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[SecureStorage] 加密失败:', errorMsg);
      throw new Error(`加密失败: ${errorMsg}`);
    }
  }

  /**
   * 解密数据
   * @param encryptedBase64 Base64 编码的密文（包含 IV + 密文）
   * @returns Promise<string> 解密后的明文文本
   * @throws {Error} 如果解密失败（数据损坏或密钥不匹配）
   */
  async decrypt(encryptedBase64: string): Promise<string> {
    if (!this.key) {
      await this.init();
    }

    try {
      const combined = base64ToBytes(encryptedBase64);
      
      // 提取 IV (前12字节)
      const iv = combined.slice(0, 12);
      // 提取密文 (剩余部分)
      const data = combined.slice(12);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        this.key!,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[SecureStorage] 解密失败:', errorMsg);
      throw new Error("数据损坏或密钥不匹配");
    }
  }
}

/**
 * 导出单例
 * 全局使用同一个 SecureStorage 实例，避免重复初始化密钥
 */
export const secureStorage = new SecureStorage();

