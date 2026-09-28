<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome(): void {
  void router.replace('/dashboard')
}
</script>

<template>
  <div class="not-found">
    <div class="not-found__code">404</div>
    <p class="not-found__text">这个页面不存在，或者你的角色没有访问权限</p>
    <el-button type="primary" @click="goHome">回到数据看板</el-button>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 70vh;
  text-align: center;
}

.not-found__code {
  font-size: 88px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 4px;
  color: var(--el-color-primary);
  opacity: 0.25;
}

.not-found__text {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>
