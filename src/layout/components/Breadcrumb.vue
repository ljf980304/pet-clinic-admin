<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

/**
 * 用 route.matched 拿匹配链，只保留有 title 的层级。
 * 首页固定放在最前面，否则直接进 /dashboard 时面包屑是空的。
 */
const items = computed(() => {
  const matched = route.matched
    .filter((item) => item.meta?.title)
    .map((item) => ({ title: item.meta.title as string, path: item.path }))

  if (matched.length > 0 && matched[0]?.path !== '/dashboard') {
    return [{ title: '首页', path: '/dashboard' }, ...matched]
  }
  return matched
})
</script>

<template>
  <el-breadcrumb separator="/" class="breadcrumb">
    <el-breadcrumb-item v-for="(item, index) in items" :key="item.path">
      <span :class="{ 'breadcrumb__current': index === items.length - 1 }">{{ item.title }}</span>
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>

<style scoped>
.breadcrumb {
  font-size: 13px;
  line-height: 56px;
}

.breadcrumb__current {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .breadcrumb {
    display: none;
  }
}
</style>
