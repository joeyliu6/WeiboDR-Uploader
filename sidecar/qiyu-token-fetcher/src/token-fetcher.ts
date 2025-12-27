import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer-core';
import { detectChromePath } from './browser-detector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const QIYU_PAGE_URL = 'https://qiyukf.com/client?k=d65beefd7552d92ee02344b3cc6173de';

export interface QiyuToken {
  token: string;
  object_path: string;
  expires: number;
}

// WebSocket 拦截脚本（将在浏览器上下文中执行）
const WS_INTERCEPT_SCRIPT = `
(function() {
  window.__captured_nos_token__ = null;
  window.__ws_message_count__ = 0;

  const OriginalWebSocket = window.WebSocket;

  window.WebSocket = function(url, protocols) {
    console.log('[WS Intercept] 新连接:', url);

    const ws = protocols
      ? new OriginalWebSocket(url, protocols)
      : new OriginalWebSocket(url);

    ws.addEventListener('message', function(event) {
      window.__ws_message_count__++;

      var text = '';
      if (event.data instanceof ArrayBuffer) {
        text = new TextDecoder('utf-8', { fatal: false }).decode(event.data);
      } else if (typeof event.data === 'string') {
        text = event.data;
      }

      if (text) {
        var tokenMatch = text.match(/UPLOAD\\s+[a-f0-9]{32}:[A-Za-z0-9+\\/=]+:[A-Za-z0-9+\\/=]+/);
        if (tokenMatch) {
          console.log('[WS Intercept] !!! 捕获到 Token !!!');
          window.__captured_nos_token__ = tokenMatch[0];
        }
      }
    });

    return ws;
  };

  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();
`;

/**
 * 创建临时测试图片文件
 */
async function createTestImage(): Promise<string> {
  const tempDir = os.tmpdir();
  const tempImagePath = path.join(tempDir, `qiyu-test-${Date.now()}.png`);

  // 创建一个最小的有效 PNG 文件 (10x10 红色图片)
  // PNG 文件格式: PNG signature + IHDR + IDAT + IEND
  const pngData = Buffer.from([
    // PNG signature
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    // IHDR chunk (13 bytes)
    0x00, 0x00, 0x00, 0x0D, // length
    0x49, 0x48, 0x44, 0x52, // type: IHDR
    0x00, 0x00, 0x00, 0x0A, // width: 10
    0x00, 0x00, 0x00, 0x0A, // height: 10
    0x08, // bit depth: 8
    0x02, // color type: RGB
    0x00, // compression
    0x00, // filter
    0x00, // interlace
    0x02, 0x36, 0x7F, 0x0C, // CRC
    // IDAT chunk (compressed image data for 10x10 red pixels)
    0x00, 0x00, 0x00, 0x1D, // length: 29
    0x49, 0x44, 0x41, 0x54, // type: IDAT
    0x78, 0x9C, 0x62, 0xF8, 0xCF, 0xC0, 0xC0, 0xC0,
    0xC0, 0xC0, 0xC8, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0,
    0xC8, 0xC0, 0xC0, 0x00, 0x00, 0x00, 0x65, 0x00,
    0x01,
    0x8F, 0x7C, 0x0C, 0x5A, // CRC
    // IEND chunk
    0x00, 0x00, 0x00, 0x00, // length: 0
    0x49, 0x45, 0x4E, 0x44, // type: IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  fs.writeFileSync(tempImagePath, pngData);
  console.error(`[QiyuToken] 创建临时测试图片: ${tempImagePath}`);
  return tempImagePath;
}

/**
 * 清理临时文件
 */
function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.error(`[QiyuToken] 已删除临时文件: ${filePath}`);
    }
  } catch (e) {
    // 忽略删除失败
  }
}

/**
 * 从七鱼页面获取上传 Token
 * 使用 Puppeteer 的 setInputFiles 真正上传测试图片
 */
export async function fetchQiyuToken(): Promise<QiyuToken> {
  console.error('[QiyuToken] ========== 开始获取 Token ==========');

  const browserInfo = detectChromePath();
  if (!browserInfo) {
    throw new Error('未检测到 Chrome 或 Edge 浏览器');
  }

  console.error(`[QiyuToken] 使用浏览器: ${browserInfo.name} (${browserInfo.path})`);

  let browser: Browser | null = null;
  let tempImagePath: string | null = null;

  try {
    // 创建临时测试图片
    tempImagePath = await createTestImage();

    browser = await puppeteer.launch({
      executablePath: browserInfo.path,
      headless: true,
      args: [
        // 基础安全参数
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        // 内存优化：禁用非必要功能
        '--disable-extensions',
        '--disable-plugins',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--memory-pressure-off',
        '--disable-ipc-flooding-protection',
        '--disable-features=TranslateUI',
        // 缓存优化
        '--aggressive-cache-discard',
        '--disk-cache-size=1',
        // 减小视口尺寸以节省内存
        '--window-size=800,600'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });

    // 创建 CDP Session 用于监听网络
    const client = await page.createCDPSession();
    await client.send('Network.enable');

    // 存储捕获的 Token
    let capturedToken: string | null = null;
    let wsMessageCount = 0;

    // 存储最近的 WebSocket 消息用于调试
    const recentMessages: string[] = [];

    // 监听 HTTP 请求（从请求头中提取 x-nos-token）
    client.on('Network.requestWillBeSent', (params: any) => {
      const url = params.request.url;
      const headers = params.request.headers;

      // 检查是否是 NOS 上传请求
      if (url.includes('nos') || url.includes('nim') || url.includes('netease') || url.includes('126.net')) {
        console.error(`[QiyuToken] 发现 NOS 相关请求: ${url}`);

        // 检查请求头中的 Token
        const nosToken = headers['x-nos-token'] || headers['X-Nos-Token'];
        if (nosToken) {
          console.error(`[QiyuToken] !!! 从 HTTP 请求头捕获到 Token !!!`);
          console.error(`[QiyuToken] x-nos-token: ${nosToken.substring(0, 100)}...`);
          capturedToken = nosToken;
        }
      }
    });

    // 监听 HTTP 响应（Token 可能通过 HTTP 接口获取）
    client.on('Network.responseReceived', async (params: any) => {
      const url = params.response.url;
      // 检查是否是获取上传凭证的接口
      if (url.includes('nos') || url.includes('token') || url.includes('upload') || url.includes('getUploadToken')) {
        try {
          const response = await client.send('Network.getResponseBody', { requestId: params.requestId });
          const body = response.body;

          // 尝试解析 Token
          const tokenMatch = body.match(/UPLOAD\s+[a-f0-9]{32}:[A-Za-z0-9+\/=]+:[A-Za-z0-9+\/=]+/);
          if (tokenMatch) {
            console.error('[QiyuToken] !!! 从 HTTP 响应捕获到 Token !!!');
            capturedToken = tokenMatch[0];
          }
        } catch (e) {
          // 可能响应体不可用
        }
      }
    });

    // 监听 WebSocket 帧接收事件
    client.on('Network.webSocketFrameReceived', (params: any) => {
      wsMessageCount++;
      const payload = params.response.payloadData;

      // 保存最近 10 条消息用于调试
      if (recentMessages.length < 10) {
        recentMessages.push(payload.substring(0, 200));
      }

      // 尝试解码 Base64 并检查内容
      try {
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        // 检查是否包含 Token
        const tokenMatch = decoded.match(/UPLOAD\s+[a-f0-9]{32}:[A-Za-z0-9+\/=]+:[A-Za-z0-9+\/=]+/);
        if (tokenMatch) {
          console.error('[QiyuToken] !!! 捕获到 Token (CDP Base64解码) !!!');
          capturedToken = tokenMatch[0];
        }
      } catch (e) {
        // 解码失败，尝试直接匹配
      }

      // 直接检查原始 payload
      const tokenMatch = payload.match(/UPLOAD\s+[a-f0-9]{32}:[A-Za-z0-9+\/=]+:[A-Za-z0-9+\/=]+/);
      if (tokenMatch) {
        console.error('[QiyuToken] !!! 捕获到 Token (CDP) !!!');
        capturedToken = tokenMatch[0];
      }
    });

    // 同时注入 JavaScript 拦截脚本作为备用方案
    await page.evaluateOnNewDocument(WS_INTERCEPT_SCRIPT);

    // 导航到七鱼页面
    console.error(`[QiyuToken] 正在打开七鱼页面: ${QIYU_PAGE_URL}`);
    await page.goto(QIYU_PAGE_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // 等待页面完全加载
    console.error('[QiyuToken] 等待页面完全加载 (5秒)...');
    await sleep(5000);

    // 使用 Puppeteer 的 setInputFiles 真正上传文件
    console.error('[QiyuToken] 查找文件输入框...');

    // 找到所有文件输入框
    const fileInputs = await page.$$('input[type="file"]');
    console.error(`[QiyuToken] 找到 ${fileInputs.length} 个文件输入框`);

    if (fileInputs.length === 0) {
      throw new Error('未找到文件输入框');
    }

    // 尝试每个文件输入框
    for (let i = 0; i < fileInputs.length; i++) {
      const fileInput = fileInputs[i];
      console.error(`[QiyuToken] 尝试使用第 ${i + 1} 个文件输入框上传...`);

      try {
        // 使用 Puppeteer 的 setInputFiles 设置文件（这会真正触发上传）
        await fileInput.uploadFile(tempImagePath);
        console.error(`[QiyuToken] 已设置文件到第 ${i + 1} 个输入框`);

        // 等待一小段时间让上传开始
        await sleep(2000);

        // 检查是否已经捕获到 Token
        if (capturedToken) {
          console.error(`[QiyuToken] 第 ${i + 1} 个输入框触发了 Token!`);
          break;
        }
      } catch (e: any) {
        console.error(`[QiyuToken] 第 ${i + 1} 个输入框失败: ${e.message}`);
      }
    }

    // 如果还没有 Token，继续等待
    if (!capturedToken) {
      console.error('[QiyuToken] 等待捕获 Token (最多20秒)...');

      for (let i = 0; i < 40; i++) {
        await sleep(500);

        // 检查 CDP 捕获的 Token
        if (capturedToken) {
          console.error(`[QiyuToken] Token 已通过 CDP 捕获 (第 ${i + 1} 次检查)`);
          break;
        }

        // 检查 JavaScript 注入捕获的 Token（备用）
        try {
          const jsToken = await page.evaluate('window.__captured_nos_token__');
          if (jsToken) {
            console.error(`[QiyuToken] Token 已通过 JS 注入捕获 (第 ${i + 1} 次检查)`);
            capturedToken = jsToken as string;
            break;
          }
        } catch (e) {
          // 忽略评估错误
        }

        // 每2秒报告状态
        if ((i + 1) % 4 === 0) {
          let jsMessageCount = 0;
          try {
            jsMessageCount = await page.evaluate('window.__ws_message_count__ || 0') as number;
          } catch (e) {
            // 忽略
          }
          console.error(`[QiyuToken] [${((i + 1) / 2).toFixed(1)}s] CDP消息: ${wsMessageCount}, JS消息: ${jsMessageCount}`);
        }
      }
    }

    if (!capturedToken) {
      // 输出调试信息
      console.error('[QiyuToken] ========== Token 获取失败 ==========');
      try {
        const debugInfo = await page.evaluate(`({
          jsMessageCount: window.__ws_message_count__ || 0,
          fileInputCount: document.querySelectorAll('input[type="file"]').length,
          pageTitle: document.title,
          pageUrl: window.location.href
        })`);
        console.error('[QiyuToken] 调试信息:', JSON.stringify(debugInfo, null, 2));
      } catch (e) {
        console.error('[QiyuToken] 无法获取调试信息');
      }

      // 输出最近的 WebSocket 消息
      if (recentMessages.length > 0) {
        console.error('[QiyuToken] 最近的 WebSocket 消息:');
        recentMessages.forEach((msg, i) => {
          console.error(`  [${i + 1}] ${msg}`);
        });
      }

      throw new Error('未能捕获到上传 Token');
    }

    console.error('[QiyuToken] ========== Token 获取成功 ==========');
    return parseToken(capturedToken);

  } finally {
    if (browser) {
      await browser.close();
    }
    if (tempImagePath) {
      cleanupTempFile(tempImagePath);
    }
  }
}

/**
 * 解析 Token 获取详细信息
 * Token 格式: "UPLOAD {AccessKey}:{Signature}:{Base64Policy}"
 */
function parseToken(token: string): QiyuToken {
  const parts = token.split(' ');
  if (parts.length !== 2 || parts[0] !== 'UPLOAD') {
    throw new Error('无效的 Token 格式');
  }

  const tokenParts = parts[1].split(':');
  if (tokenParts.length !== 3) {
    throw new Error('Token 格式错误');
  }

  // 解析 Base64 Policy
  const policyBase64 = tokenParts[2];
  const policyJson = Buffer.from(policyBase64, 'base64').toString('utf-8');
  const policy = JSON.parse(policyJson);

  const objectPath = policy.Object;
  if (!objectPath) {
    throw new Error('Policy 中缺少 Object 字段');
  }

  const expires = policy.Expires || 0;

  console.error('[QiyuToken] Token 解析成功');
  console.error(`[QiyuToken]   Object: ${objectPath}`);
  console.error(`[QiyuToken]   Expires: ${expires}`);

  return {
    token,
    object_path: objectPath,
    expires
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
