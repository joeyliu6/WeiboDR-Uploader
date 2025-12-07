<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ProgressBar from 'primevue/progressbar';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { useToast } from '../../composables/useToast';
import { useConfirm } from '../../composables/useConfirm';

const toast = useToast();
const { confirmDelete } = useConfirm();

// 检测状态
const isChecking = ref(false);
const isCancelled = ref(false);

// 筛选
const serviceFilter = ref('all');
const serviceOptions = [
  { label: '全部图床', value: 'all' },
  { label: '微博图床', value: 'weibo' },
  { label: 'Cloudflare R2', value: 'r2' },
  { label: 'TCL 图床', value: 'tcl' },
  { label: '京东图床', value: 'jd' },
  { label: '牛客图床', value: 'nowcoder' },
  { label: '七鱼图床', value: 'qiyu' },
  { label: '知乎图床', value: 'zhihu' },
  { label: '纳米图床', value: 'nami' }
];

// 统计数据
const stats = ref({
  total: 0,
  valid: 0,
  invalid: 0,
  pending: 0
});

// 进度
const progress = ref(0);
const progressText = ref('检测中... 0/0');

// 检测结果
interface CheckResult {
  fileName: string;
  link: string;
  service: string;
  status: 'valid' | 'invalid' | 'pending';
  statusCode?: number;
  error?: string;
}

const results = ref<CheckResult[]>([]);

// 开始检测
const startCheck = async () => {
  if (isChecking.value) return;

  isChecking.value = true;
  isCancelled.value = false;
  results.value = [];

  try {
    // TODO: 调用后端检测逻辑
    toast.info('开始检测', '链接检测功能待集成');

    // 模拟检测进度
    for (let i = 0; i <= 100; i += 10) {
      if (isCancelled.value) break;

      progress.value = i;
      progressText.value = `检测中... ${i}/100`;
      stats.value = {
        total: 100,
        valid: Math.floor(i * 0.8),
        invalid: Math.floor(i * 0.1),
        pending: 100 - i
      };

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!isCancelled.value) {
      toast.success('检测完成', '所有链接已检测完毕');
    }
  } catch (error) {
    toast.error('检测失败', String(error));
  } finally {
    isChecking.value = false;
  }
};

// 取消检测
const cancelCheck = () => {
  isCancelled.value = true;
  isChecking.value = false;
  toast.info('已取消', '链接检测已取消');
};

// 删除失效链接
const deleteInvalid = () => {
  const invalidCount = results.value.filter(r => r.status === 'invalid').length;

  if (invalidCount === 0) {
    toast.warn('无失效链接', '没有找到失效的链接');
    return;
  }

  confirmDelete(
    `确定要删除 ${invalidCount} 个失效链接吗？此操作不可撤销。`,
    () => {
      results.value = results.value.filter(r => r.status !== 'invalid');
      stats.value.invalid = 0;
      stats.value.total -= invalidCount;
      toast.success('删除成功', `已删除 ${invalidCount} 个失效链接`);
    }
  );
};

// 复制链接
const copyLink = async (link: string) => {
  try {
    // TODO: 复制到剪贴板
    toast.success('已复制', '链接已复制到剪贴板');
  } catch (error) {
    toast.error('复制失败', String(error));
  }
};

// 获取状态标签样式
const getStatusSeverity = (status: string): 'success' | 'danger' | 'secondary' | undefined => {
  switch (status) {
    case 'valid': return 'success';
    case 'invalid': return 'danger';
    default: return 'secondary';
  }
};

// 获取状态标签文本
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'valid': return '✓ 有效';
    case 'invalid': return '✗ 失效';
    default: return '待检测';
  }
};
</script>

<template>
  <div class="link-checker-view">
    <div class="link-checker-container">
      <!-- 标题 -->
      <div class="link-checker-header">
        <h1>图片链接检测</h1>
        <p class="link-checker-desc">检测历史记录中的图片链接是否仍然有效</p>
      </div>

      <!-- 控制区域 -->
      <div class="link-checker-controls">
        <div class="link-checker-filter-group">
          <label>筛选图床：</label>
          <Select
            v-model="serviceFilter"
            :options="serviceOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择图床"
            class="service-filter"
          />
        </div>

        <Button
          label="开始检测"
          icon="pi pi-play"
          @click="startCheck"
          :disabled="isChecking"
          severity="success"
        />

        <Button
          label="取消"
          icon="pi pi-stop"
          @click="cancelCheck"
          :disabled="!isChecking"
          outlined
        />
      </div>

      <!-- 进度条 -->
      <div v-if="isChecking" class="link-checker-progress">
        <div class="link-checker-progress-header">
          <span>{{ progressText }}</span>
          <span>{{ progress }}%</span>
        </div>
        <ProgressBar :value="progress" />
      </div>

      <!-- 统计卡片 -->
      <div class="link-checker-stats">
        <div class="link-checker-stat-card">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总数</div>
        </div>
        <div class="link-checker-stat-card valid">
          <div class="stat-value">{{ stats.valid }}</div>
          <div class="stat-label">有效</div>
        </div>
        <div class="link-checker-stat-card invalid">
          <div class="stat-value">{{ stats.invalid }}</div>
          <div class="stat-label">失效</div>
        </div>
        <div class="link-checker-stat-card pending">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待检测</div>
        </div>
      </div>

      <!-- 检测结果 -->
      <div class="link-checker-results">
        <div class="link-checker-results-header">
          <h3>检测结果</h3>
          <Button
            label="删除失效"
            icon="pi pi-trash"
            @click="deleteInvalid"
            :disabled="stats.invalid === 0"
            severity="danger"
            outlined
            size="small"
          />
        </div>

        <DataTable
          :value="results"
          paginator
          :rows="20"
          :rowsPerPageOptions="[10, 20, 50, 100]"
          class="link-checker-table"
          emptyMessage="点击【开始检测】检查历史记录中的图片链接"
        >
          <Column field="fileName" header="文件名" sortable>
            <template #body="slotProps">
              <span :title="slotProps.data.fileName">{{ slotProps.data.fileName }}</span>
            </template>
          </Column>

          <Column field="link" header="链接">
            <template #body="slotProps">
              <a
                :href="slotProps.data.link"
                target="_blank"
                rel="noopener noreferrer"
                class="link-url"
                :title="slotProps.data.link"
              >
                {{ slotProps.data.link.substring(0, 50) }}...
              </a>
            </template>
          </Column>

          <Column field="service" header="图床" sortable style="width: 100px">
            <template #body="slotProps">
              <Tag :value="slotProps.data.service" severity="info" />
            </template>
          </Column>

          <Column field="status" header="状态" sortable style="width: 100px">
            <template #body="slotProps">
              <Tag
                :value="getStatusLabel(slotProps.data.status)"
                :severity="getStatusSeverity(slotProps.data.status)"
              />
            </template>
          </Column>

          <Column header="操作" style="width: 100px">
            <template #body="slotProps">
              <Button
                icon="pi pi-copy"
                @click="copyLink(slotProps.data.link)"
                size="small"
                text
                rounded
                v-tooltip.top="'复制链接'"
              />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.link-checker-view {
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: var(--bg-app);
}

.link-checker-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 标题 */
.link-checker-header {
  text-align: center;
}

.link-checker-header h1 {
  margin: 0 0 8px 0;
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.link-checker-desc {
  margin: 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

/* 控制区域 */
.link-checker-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  background: var(--bg-card);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
}

.link-checker-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
}

.link-checker-filter-group label {
  color: var(--text-primary);
  font-weight: 500;
}

.service-filter {
  min-width: 150px;
}

/* 进度条 */
.link-checker-progress {
  background: var(--bg-card);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
}

.link-checker-progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* 统计卡片 */
.link-checker-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.link-checker-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.2s;
}

.link-checker-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.link-checker-stat-card.valid .stat-value {
  color: var(--success);
}

.link-checker-stat-card.invalid .stat-value {
  color: var(--error);
}

.link-checker-stat-card.pending .stat-value {
  color: var(--text-muted);
}

/* 检测结果 */
.link-checker-results {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
}

.link-checker-results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.link-checker-results-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.link-checker-table {
  background: transparent;
}

.link-url {
  color: var(--primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 300px;
}

.link-url:hover {
  text-decoration: underline;
}

/* 滚动条 */
.link-checker-view::-webkit-scrollbar {
  width: 8px;
}

.link-checker-view::-webkit-scrollbar-track {
  background: var(--bg-input);
}

.link-checker-view::-webkit-scrollbar-thumb {
  background: var(--border-subtle);
  border-radius: 4px;
}

.link-checker-view::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
</style>
