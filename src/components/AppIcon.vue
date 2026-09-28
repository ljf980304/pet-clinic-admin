<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowDown,
  Collection,
  DataLine,
  Delete,
  Download,
  Edit,
  Expand,
  FirstAidKit,
  Fold,
  Histogram,
  List,
  Lock,
  Money,
  Monitor,
  Moon,
  OfficeBuilding,
  Odometer,
  PieChart,
  Plus,
  Refresh,
  Search,
  Setting,
  Star,
  Sunny,
  SwitchButton,
  Timer,
  TrendCharts,
  User,
} from '@element-plus/icons-vue'

/**
 * 显式列出一张图标表，而不是 `import * as icons`。
 * 后者会把全部 294 个图标都打进产物里，白涨几百 KB。
 */
const ICONS = {
  ArrowDown,
  Collection,
  DataLine,
  Delete,
  Download,
  Edit,
  Expand,
  FirstAidKit,
  Fold,
  Histogram,
  List,
  Lock,
  Money,
  Monitor,
  Moon,
  OfficeBuilding,
  Odometer,
  PieChart,
  Plus,
  Refresh,
  Search,
  Setting,
  Star,
  Sunny,
  SwitchButton,
  Timer,
  TrendCharts,
  User,
}

const props = defineProps<{ name?: string }>()

const icon = computed(() => (props.name ? ICONS[props.name as keyof typeof ICONS] : undefined))
</script>

<template>
  <el-icon v-if="icon" class="app-icon">
    <component :is="icon" />
  </el-icon>
</template>

<style scoped>
.app-icon {
  vertical-align: middle;
}
</style>
