// src/uploaders/tcl/TCLRateLimiter.ts
/**
 * TCL 图床限速器
 *
 * 规则：连续上传 10 张图片后，服务端会限流约 36 秒
 * 策略：
 * 1. 令牌桶机制，容量 10
 * 2. 每次申请立即计数（不论成功失败）
 * 3. 计数达到 10 时，强制等待 36 秒（冷却）
 * 4. 冷却结束后重置计数
 */
export class TCLRateLimiter {
  private static instance: TCLRateLimiter;
  
  private sentInBatch: number = 0;
  private readonly BATCH_LIMIT = 10;
  private readonly COOLDOWN_MS = 36000 + 2000; // 36s + 2s 缓冲
  private cooldownPromise: Promise<void> | null = null;
  
  private constructor() {}
  
  static getInstance(): TCLRateLimiter {
    if (!TCLRateLimiter.instance) {
      TCLRateLimiter.instance = new TCLRateLimiter();
    }
    return TCLRateLimiter.instance;
  }
  
  /**
   * 申请上传许可
   * 如果达到速率限制，此方法会挂起直到冷却结束
   */
  async acquire(): Promise<void> {
    // 1. 如果正在冷却，等待冷却结束
    if (this.cooldownPromise) {
      console.log(`[TCLRateLimiter] 正在冷却中，等待恢复...`);
      await this.cooldownPromise;
    }

    // 2. 增加当前批次计数
    // 关键：在放行前就计数，而不是完成后
    this.sentInBatch++;
    console.log(`[TCLRateLimiter] 申请许可: ${this.sentInBatch}/${this.BATCH_LIMIT}`);

    // 3. 检查是否触发限流
    if (this.sentInBatch >= this.BATCH_LIMIT) {
      console.log(`[TCLRateLimiter] 达到批次限制 (${this.BATCH_LIMIT})，触发冷却 (${this.COOLDOWN_MS}ms)`);
      
      // 创建冷却 Promise
      this.cooldownPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log('[TCLRateLimiter] 冷却结束，重置计数');
          this.sentInBatch = 0;
          this.cooldownPromise = null;
          resolve();
        }, this.COOLDOWN_MS);
      });
      
      // 注意：当前请求是第 10 个（或更多），它本身不需要等待（如果它是触发者）
      // 但如果是严格的 "连续 10 张后触发"，第 10 张是最后一张允许的。
      // 第 11 张进来时，会看到 sentInBatch > 10 (如果没重置) 或看到 cooldownPromise。
      
      // 修正逻辑：
      // 如果当前是第 10 张，我们标记冷却，但让当前这张通过。
      // 下一张（第 11 张）在 acquire() 开头会 await this.cooldownPromise。
      // 所以不需要在这里 await。
    }
  }
}
