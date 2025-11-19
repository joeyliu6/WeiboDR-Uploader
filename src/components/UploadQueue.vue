<script setup lang="ts">
import { ref } from 'vue';
import { writeText } from '@tauri-apps/api/clipboard';

export interface QueueItem {
  id: string;
  fileName: string;
  uploadToR2: boolean;
  weiboProgress: number;
  r2Progress: number;
  weiboStatus: string;
  r2Status: string;
  weiboPid?: string;
  weiboLink?: string;
  r2Link?: string;
  baiduLink?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  thumbUrl?: string;
}

const items = ref<QueueItem[]>([]);

const copyToClipboard = async (text: string | undefined, event: Event) => {
    if (!text) return;
    try {
        await writeText(text);
        const btn = event.target as HTMLButtonElement;
        const originalText = btn.textContent;
        btn.textContent = '✓ 已复制';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('copied');
        }, 1500);
    } catch (err) {
        console.error('Copy failed', err);
    }
};

defineExpose({
  addFile: (item: QueueItem) => {
      // Prepend to match "newest first" behavior
      items.value.unshift(item);
  },
  updateItem: (id: string, updates: Partial<QueueItem>) => {
      const item = items.value.find(i => i.id === id);
      if (item) {
          Object.assign(item, updates);
          // Update thumbUrl if PID is available and not set
          if (item.weiboPid && !item.thumbUrl) {
              const baiduPrefix = 'https://image.baidu.com/search/down?thumburl=';
              const bmiddleUrl = `https://tvax1.sinaimg.cn/bmiddle/${item.weiboPid}.jpg`;
              item.thumbUrl = `${baiduPrefix}${bmiddleUrl}`;
          }
      }
  },
  getItem: (id: string) => items.value.find(i => i.id === id),
  clear: () => items.value = [],
  count: () => items.value.length
});
</script>

<template>
  <div class="upload-queue-vue">
    <div v-for="item in items" :key="item.id" class="upload-item" :class="[item.status, { 'upload-success': item.status === 'success', 'upload-error': item.status === 'error' }]">
      
      <!-- Preview Column -->
      <div class="preview">
        <img v-if="item.thumbUrl" :src="item.thumbUrl" :alt="item.fileName" class="thumb-img" onerror="this.style.display='none'">
        <span v-else-if="item.status === 'error'" class="error-icon">⚠️</span>
        <span v-else class="loading-icon">⏳</span>
      </div>

      <!-- Filename Column -->
      <div class="filename" :title="item.fileName">{{ item.fileName }}</div>

      <!-- Progress Column -->
      <div class="progress-section">
        <div class="progress-row">
            <label>微博:</label>
            <progress :value="item.weiboProgress" max="100"></progress>
            <span class="status" :class="{ success: item.weiboStatus.includes('✓'), error: item.weiboStatus.includes('✗') }">{{ item.weiboStatus }}</span>
        </div>
        <div class="progress-row">
            <label>R2:</label>
            <progress :value="item.r2Progress" max="100"></progress>
            <span class="status" :class="{ success: item.r2Status.includes('✓'), error: item.r2Status.includes('✗'), skipped: item.r2Status === '已跳过' }">{{ item.r2Status }}</span>
        </div>
      </div>

      <!-- Actions Column -->
      <div class="actions">
        <button @click="copyToClipboard(item.weiboLink, $event)" :disabled="!item.weiboLink">📸 微博</button>
        <button @click="copyToClipboard(item.baiduLink, $event)" :disabled="!item.baiduLink">🔗 百度</button>
        <button v-if="item.uploadToR2" @click="copyToClipboard(item.r2Link, $event)" :disabled="!item.r2Link">☁️ R2</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Inherit or adapt styles from style.css */
.upload-queue-vue {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.upload-item {
    display: flex;
    align-items: center;
    padding: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
    gap: 10px;
    color: var(--text-primary);
    transition: all 0.2s ease;
}

.upload-item.upload-success {
    border-left: 4px solid var(--success);
    background: rgba(16, 185, 129, 0.1);
}

.upload-item.upload-error {
    border-left: 4px solid var(--error);
    background: rgba(239, 68, 68, 0.1);
}

.preview {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-input);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--border-subtle);
}

.thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.filename {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.9em;
    font-weight: 500;
    max-width: 150px;
    color: var(--text-primary);
}

.progress-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 200px;
}

.progress-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.8em;
    color: var(--text-secondary);
}

.progress-row label {
    width: 35px;
    text-align: right;
}

progress {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    /* Webkit styling for progress bar */
    -webkit-appearance: none;
    background-color: var(--bg-input);
}

progress::-webkit-progress-bar {
    background-color: var(--bg-input);
}

progress::-webkit-progress-value {
    background-color: var(--primary);
    transition: width 0.3s ease;
}

.status {
    width: 50px;
    text-align: right;
    font-size: 0.85em;
}

.status.success { color: var(--success); }
.status.error { color: var(--error); }
.status.skipped { color: var(--text-muted); }

.actions {
    display: flex;
    gap: 5px;
}

.actions button {
    padding: 4px 8px;
    font-size: 0.8em;
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    background: var(--bg-input);
    color: var(--text-primary);
    border-radius: 4px;
    transition: all 0.2s;
}

.actions button:hover:not(:disabled) {
    background: var(--primary);
    border-color: var(--primary);
}

.actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--bg-app);
}

.actions button.copied {
    background: var(--success);
    color: white;
    border-color: var(--success);
}
</style>
