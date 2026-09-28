<script setup lang="ts">
import zhCn from 'element-plus/es/locale/lang/zh-cn'
</script>

<template>
  <!-- 统一中文文案：分页、日期选择器、确认框里的按钮都会跟着变 -->
  <el-config-provider :locale="zhCn">
    <router-view />
  </el-config-provider>
</template>
