<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { EChartsOption } from 'echarts'
import AppIcon from '@/components/AppIcon.vue'
import BaseChart from '@/components/BaseChart.vue'
import { dashboardApi } from '@/api'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import type { DashboardStats, StatCard } from '@/types'

// keep-alive 的 include 是按组件名匹配的，<script setup> 不会自动推导名字，必须显式声明
defineOptions({ name: 'Dashboard' })

const appStore = useAppStore()
const userStore = useUserStore()

const loading = ref(true)
const stats = ref<DashboardStats | null>(null)

/** 图表的文字和网格线要跟着主题走，否则暗色模式下会看不清 */
const axisColor = computed(() => (appStore.isDark ? '#8d95a3' : '#8492a6'))
const splitColor = computed(() =>
  appStore.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
)

const PALETTE = ['#409eff', '#36cfc9', '#ffa940', '#f759ab', '#73d13d', '#9254de']

function formatValue(card: StatCard): string {
  return card.value.toLocaleString('zh-CN')
}

/** 环比涨跌的配色 */
function deltaType(delta: number): 'up' | 'down' | 'flat' {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

const trendOption = computed<EChartsOption>(() => {
  const trend = stats.value?.visitTrend
  return {
    color: PALETTE,
    tooltip: { trigger: 'axis' },
    legend: { data: ['接诊量', '新增宠物'], textStyle: { color: axisColor.value }, top: 0 },
    grid: { left: 8, right: 16, bottom: 8, top: 44, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend?.dates ?? [],
      axisLine: { lineStyle: { color: splitColor.value } },
      axisLabel: { color: axisColor.value },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: splitColor.value } },
      axisLabel: { color: axisColor.value },
    },
    series: [
      {
        name: '接诊量',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: trend?.visits ?? [],
      },
      {
        name: '新增宠物',
        type: 'line',
        smooth: true,
        showSymbol: false,
        areaStyle: { opacity: 0.15 },
        data: trend?.newPets ?? [],
      },
    ],
  }
})

const clinicOption = computed<EChartsOption>(() => {
  const data = stats.value?.clinicPerformance
  return {
    color: PALETTE,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value) => `¥${Number(value).toLocaleString('zh-CN')}`,
    },
    legend: { data: ['实际营收', '目标'], textStyle: { color: axisColor.value }, top: 0 },
    grid: { left: 8, right: 16, bottom: 8, top: 44, containLabel: true },
    xAxis: {
      type: 'category',
      data: data?.clinics ?? [],
      axisLine: { lineStyle: { color: splitColor.value } },
      axisLabel: { color: axisColor.value },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: splitColor.value } },
      axisLabel: {
        color: axisColor.value,
        formatter: (value: number) => `${value / 1000}k`,
      },
    },
    series: [
      {
        name: '实际营收',
        type: 'bar',
        barWidth: 22,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: data?.revenue ?? [],
      },
      {
        name: '目标',
        type: 'bar',
        barWidth: 22,
        itemStyle: { borderRadius: [4, 4, 0, 0], opacity: 0.35 },
        data: data?.target ?? [],
      },
    ],
  }
})

const speciesOption = computed<EChartsOption>(() => ({
  color: PALETTE,
  tooltip: { trigger: 'item', formatter: '{b}：{c} 只（{d}%）' },
  legend: { bottom: 0, textStyle: { color: axisColor.value } },
  series: [
    {
      type: 'pie',
      radius: ['52%', '72%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderWidth: 2, borderColor: 'transparent' },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
      data: stats.value?.speciesDistribution ?? [],
    },
  ],
}))

onMounted(async () => {
  try {
    stats.value = await dashboardApi.stats()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page dashboard" v-loading="loading">
    <el-alert
      v-if="userStore.role !== 'admin'"
      type="info"
      show-icon
      :closable="false"
      class="dashboard__notice"
    >
      <template #title>
        当前以「{{ userStore.roleName }}」身份查看，数据范围为「{{
          userStore.clinicName
        }}」。切换到管理员可看全部门店。
      </template>
    </el-alert>

    <!-- 统计卡片 -->
    <section class="dashboard__cards">
      <el-card v-for="card in stats?.cards ?? []" :key="card.key" shadow="hover" class="stat">
        <div class="stat__head">
          <span class="stat__label">{{ card.label }}</span>
          <AppIcon :name="card.icon" class="stat__icon" />
        </div>

        <div class="stat__value tabular">
          <span class="stat__unit" v-if="card.unit === '元'">¥</span>
          {{ formatValue(card) }}
          <span class="stat__unit" v-if="card.unit !== '元'">{{ card.unit }}</span>
        </div>

        <div class="stat__delta" :class="`stat__delta--${deltaType(card.delta)}`">
          <AppIcon :name="card.delta >= 0 ? 'TrendCharts' : 'ArrowDown'" />
          <span>{{ Math.abs(card.delta) }}%</span>
          <span class="stat__delta-label">较上周</span>
        </div>
      </el-card>
    </section>

    <!-- 图表 -->
    <el-row :gutter="16" class="dashboard__row">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="dashboard__card">
          <template #header><span class="dashboard__card-title">近两周接诊趋势</span></template>
          <BaseChart :option="trendOption" height="320px" />
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="dashboard__card">
          <template #header><span class="dashboard__card-title">物种分布</span></template>
          <BaseChart :option="speciesOption" height="320px" />
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never" class="dashboard__card">
      <template #header><span class="dashboard__card-title">门店业绩达成</span></template>
      <BaseChart :option="clinicOption" height="300px" />
    </el-card>
  </div>
</template>

<style scoped>
.dashboard {
  gap: 16px;
}

.dashboard__notice {
  border-radius: var(--app-radius);
}

.dashboard__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--el-text-color-secondary);
}

.stat__label {
  font-size: 13px;
}

.stat__icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.stat__value {
  display: flex;
  align-items: baseline;
  gap: 3px;
  margin: 10px 0 8px;
  font-size: 26px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.stat__unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.stat__delta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.stat__delta--up {
  color: var(--el-color-success);
}

.stat__delta--down {
  color: var(--el-color-danger);
}

.stat__delta--flat {
  color: var(--el-text-color-secondary);
}

.stat__delta-label {
  color: var(--el-text-color-secondary);
  margin-left: 2px;
}

.dashboard__row {
  margin-bottom: 0;
}

.dashboard__card {
  border-radius: var(--app-radius);
  margin-bottom: 16px;
}

.dashboard__card-title {
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .dashboard__cards {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }

  .stat__value {
    font-size: 20px;
  }
}
</style>
