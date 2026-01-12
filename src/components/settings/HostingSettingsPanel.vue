<script setup lang="ts">
/**
 * 图床设置统一面板
 * 使用折叠面板（Accordion）形式整合所有图床配置
 * 分类：私有图床、开箱即用、Cookie认证、Token认证
 */
import { ref } from 'vue';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import PrivateHostingPanel from './PrivateHostingPanel.vue';
import BuiltinHostingPanel from './BuiltinHostingPanel.vue';
import CookieAuthHostingPanel from './CookieAuthHostingPanel.vue';
import TokenAuthHostingPanel from './TokenAuthHostingPanel.vue';

// Props 定义
interface PrivateHostingFormData {
  r2: { accountId: string; accessKeyId: string; secretAccessKey: string; bucketName: string; path: string; publicDomain: string };
  cos: { secretId: string; secretKey: string; region: string; bucket: string; path: string; publicDomain: string };
  oss: { accessKeyId: string; accessKeySecret: string; region: string; bucket: string; path: string; publicDomain: string };
  qiniu: { accessKey: string; secretKey: string; region: string; bucket: string; domain: string; path: string };
  upyun: { operator: string; password: string; bucket: string; domain: string; path: string };
}

interface CookieFormData {
  weibo: { cookie: string };
  zhihu: { cookie: string };
  nowcoder: { cookie: string };
  nami: { cookie: string };
  bilibili: { cookie: string };
  chaoxing: { cookie: string };
}

interface TokenFormData {
  smms: { token: string };
  github: { token: string; owner: string; repo: string; branch: string; path: string; customDomain?: string };
  imgur: { clientId: string; clientSecret?: string };
}

const props = defineProps<{
  privateFormData: PrivateHostingFormData;
  cookieFormData: CookieFormData;
  tokenFormData: TokenFormData;
  testingConnections: Record<string, boolean>;
  // 开箱即用检测状态
  jdAvailable: boolean;
  qiyuAvailable: boolean;
  isCheckingJd: boolean;
  isCheckingQiyu: boolean;
}>();

const emit = defineEmits<{
  save: [];
  testPrivate: [providerId: string];
  testToken: [providerId: string];
  testCookie: [providerId: string];
  checkBuiltin: [providerId: string];
}>();

// 默认展开的面板（可以同时展开多个）
const activeAccordions = ref<number[]>([]);

// 处理保存
const handleSave = () => {
  emit('save');
};

// 处理私有图床测试
const handleTestPrivate = (providerId: string) => {
  emit('testPrivate', providerId);
};

// 处理 Token 图床测试
const handleTestToken = (providerId: string) => {
  emit('testToken', providerId);
};

// 处理 Cookie 图床测试
const handleTestCookie = (providerId: string) => {
  emit('testCookie', providerId);
};

// 处理开箱即用检测
const handleCheckBuiltin = (providerId: string) => {
  emit('checkBuiltin', providerId);
};
</script>

<template>
  <div class="hosting-settings-panel">
    <!-- 页面标题 -->
    <div class="panel-header">
      <h2>图床设置</h2>
      <p class="header-desc">根据认证方式和使用场景选择合适的图床服务</p>
    </div>

    <!-- 折叠面板 -->
    <Accordion :value="activeAccordions" multiple class="hosting-accordion">
      <!-- 私有图床 -->
      <AccordionPanel value="0">
        <AccordionHeader>
          <div class="accordion-title">
            <i class="pi pi-server"></i>
            <span>私有图床</span>
            <span class="category-count">5</span>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <PrivateHostingPanel
            :formData="privateFormData"
            :testingConnections="testingConnections"
            @save="handleSave"
            @test="handleTestPrivate"
          />
        </AccordionContent>
      </AccordionPanel>

      <!-- 开箱即用 -->
      <AccordionPanel value="1">
        <AccordionHeader>
          <div class="accordion-title">
            <i class="pi pi-box"></i>
            <span>开箱即用</span>
            <span class="category-count">2</span>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <BuiltinHostingPanel
            :jdAvailable="jdAvailable"
            :qiyuAvailable="qiyuAvailable"
            :isCheckingJd="isCheckingJd"
            :isCheckingQiyu="isCheckingQiyu"
            @check="handleCheckBuiltin"
          />
        </AccordionContent>
      </AccordionPanel>

      <!-- Cookie 认证 -->
      <AccordionPanel value="2">
        <AccordionHeader>
          <div class="accordion-title">
            <i class="pi pi-key"></i>
            <span>Cookie 认证</span>
            <span class="category-count">6</span>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <CookieAuthHostingPanel
            :formData="cookieFormData"
            :testingConnections="testingConnections"
            @save="handleSave"
            @test="handleTestCookie"
          />
        </AccordionContent>
      </AccordionPanel>

      <!-- Token 认证 -->
      <AccordionPanel value="3">
        <AccordionHeader>
          <div class="accordion-title">
            <i class="pi pi-shield"></i>
            <span>Token 认证</span>
            <span class="category-count">3</span>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <TokenAuthHostingPanel
            :formData="tokenFormData"
            :testingConnections="testingConnections"
            @save="handleSave"
            @test="handleTestToken"
          />
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>

<style scoped>
.hosting-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}

/* 页面标题 */
.panel-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-color);
}

.panel-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.header-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Accordion 样式 */
.hosting-accordion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Accordion 标题样式 */
.accordion-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.accordion-title i {
  font-size: 1.125rem;
  color: var(--primary-color);
}

.category-count {
  margin-left: auto;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 12px;
  min-width: 28px;
  text-align: center;
}

/* 响应式 */
@media (max-width: 768px) {
  .panel-header h2 {
    font-size: 1.25rem;
  }

  .accordion-title {
    font-size: 0.9375rem;
  }
}
</style>
