<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseChart from '@/components/BaseChart.vue'
import { clinicApi, dashboardApi } from '@/api'
import { useAppStore } from '@/stores/app'
import type { Clinic } from '@/types'
import type { EChartsOption } from 'echarts'

const appStore = useAppStore()

const loading = ref(true)
const clinics = ref<Clinic[]>([])
const revenue = ref<number[]>([])
const target = ref<number[]>([])

const axisColor = computed(() => (appStore.isDark ? '#8d95a3' : '#8492a6'))
const splitColor = computed(() =>
  appStore.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
)

/** 达成率 = 实际营收 / 目标 */
const rows = computed(() =>
  clinics.value.map((clinic, index) => {
    const actual = revenue.value[index] ?? 0
    const goal = target.value[index] ?? 0
    return {
      ...clinic,
      revenue: actual,
      target: goal,
      rate: goal > 0 ? Math.round((actual / goal) * 100) : 0,
    }
  }),
)

const rateOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 8, right: 24, top: 24, bottom: 8, containLabel: true },
  xAxis: {
    type: 'value',
    max: 140,
    splitLine: { lineStyle: { color: splitColor.value } },
    axisLabel: { color: axisColor.value, formatter: '{value}%' },
  },
  yAxis: {
    type: 'category',
    data: rows.value.map((item) => item.name),
    axisLine: { lineStyle: { color: splitColor.value } },
    axisLabel: { color: axisColor.value },
  },
  series: [
    {
      name: '目标达成率',
      type: 'bar',
      barWidth: 18,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: '{c}%', color: axisColor.value },
      data: rows.value.map((item) => item.rate),
    },
  ],
}))

onMounted(async () => {
  try {
    const [clinicList, stats] = await Promise.all([clinicApi.list(), dashboardApi.stats()])
    clinics.value = clinicList
    revenue.value = stats.clinicPerformance.revenue
    target.value = stats.clinicPerformance.target
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <el-card shadow="never" class="page__card">
      <template #header>
        <div class="clinic__header">
          <span class="clinic__title">门店经营概况</span>
          <el-tag type="danger" size="small" effect="light">仅管理员可见</el-tag>
        </div>
      </template>

      <el-table :data="rows" border stripe>
        <el-table-column prop="name" label="门店名称" min-width="170" />
        <el-table-column prop="city" label="城市" width="100" />

        <el-table-column label="本月营收" min-width="130" align="right">
          <template #default="{ row }">
            <span class="tabular">¥{{ row.revenue.toLocaleString('zh-CN') }}</span>
          </template>
        </el-table-column>

        <el-table-column label="目标" min-width="120" align="right">
          <template #default="{ row }">
            <span class="tabular clinic__muted">¥{{ row.target.toLocaleString('zh-CN') }}</span>
          </template>
        </el-table-column>

        <el-table-column label="达成率" min-width="160">
          <template #default="{ row }">
            <el-progress
              :percentage="Math.min(row.rate, 100)"
              :status="row.rate >= 100 ? 'success' : undefined"
              :stroke-width="14"
              :format="() => `${row.rate}%`"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="page__card">
      <template #header><span class="clinic__title">目标达成率对比</span></template>
      <BaseChart :option="rateOption" height="220px" />
    </el-card>

    <el-alert type="info" :closable="false" show-icon class="page__card">
      <template #title>
        这个页面的作用是演示「路由级权限」：它的 meta.roles 只允许管理员访问，
        其他角色登录后左边菜单里根本不会出现这一项。
        <AppIcon name="Lock" />
      </template>
    </el-alert>
  </div>
</template>

<style scoped>
.clinic__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.clinic__title {
  font-size: 15px;
  font-weight: 600;
}

.clinic__muted {
  color: var(--el-text-color-secondary);
}
</style>
