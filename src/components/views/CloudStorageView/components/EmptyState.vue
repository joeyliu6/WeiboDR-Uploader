<script setup lang="ts">
import Button from 'primevue/button';
import { getIllustration } from '../../../../utils/icons';

defineProps<{
  /** 图标 */
  icon?: string;
  /** 标题 */
  title: string;
  /** 描述 */
  description?: string;
  /** 操作按钮文本 */
  actionLabel?: string;
  /** 操作按钮图标 */
  actionIcon?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="empty-state">
    <!-- SVG 插画 -->
    <div class="empty-illustration" v-html="getIllustration('cloud-upload')"></div>

    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <Button
      v-if="actionLabel"
      :label="actionLabel"
      :icon="actionIcon ? `pi ${actionIcon}` : undefined"
      @click="emit('action')"
      class="empty-action"
    />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  height: 100%;
  min-height: 400px;
}

.empty-illustration {
  width: 180px;
  height: 140px;
  margin-bottom: 28px;
  color: var(--primary);
  opacity: 0.9;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-illustration :deep(svg) {
  width: 100%;
  height: 100%;
}

.empty-title {
  margin: 0 0 10px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-description {
  margin: 0 0 28px 0;
  font-size: 14px;
  color: var(--text-muted);
  max-width: 300px;
  line-height: 1.6;
}

.empty-action {
  font-weight: 500;
  padding: 10px 24px;
  border-radius: 10px;
}
</style>
