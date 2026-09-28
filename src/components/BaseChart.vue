<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'

/**
 * 按需注册：只引入用到的图表类型和组件。
 * 全量 `import * as echarts from 'echarts'` 会把所有图表都打进来，
 * 按需之后这部分体积能小一半以上。
 */
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

const props = withDefaults(
  defineProps<{
    option: EChartsOption
    height?: string
  }>(),
  { height: '320px' },
)

const container = ref<HTMLDivElement | null>(null)
const chart = shallowRef<ReturnType<typeof echarts.init> | null>(null)
let observer: ResizeObserver | null = null

function render(): void {
  // notMerge=true：数据源换了之后要完全重画，否则残留的旧 series 会叠在上面
  chart.value?.setOption(props.option, true)
}

onMounted(() => {
  if (!container.value) return
  chart.value = echarts.init(container.value)
  render()

  // 用 ResizeObserver 而不是 window.resize ——
  // 侧边栏折叠时窗口尺寸没变，但容器宽度变了，只监听 window 是抓不到的。
  observer = new ResizeObserver(() => chart.value?.resize())
  observer.observe(container.value)
})

watch(() => props.option, render, { deep: true })

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  // 不 dispose 的话切换路由会泄漏 canvas 和事件监听
  chart.value?.dispose()
  chart.value = null
})
</script>

<template>
  <div ref="container" class="base-chart" :style="{ height }" />
</template>

<style scoped>
.base-chart {
  width: 100%;
}
</style>
