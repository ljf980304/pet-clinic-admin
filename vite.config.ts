import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// Element Plus 按需引入：只打包用到的组件（JS 层面）。
//
// importStyle: false 是刻意的 —— 样式在 main.ts 里一次性引入完整版。
// 如果让解析器去按组件引样式，会带来两个问题：
//   1. 和 main.ts 的完整 CSS 重复；
//   2. dev server 首次访问某个路由时才发现新的样式模块，
//      Vite 触发重新预构建，把正在加载的模块请求打成 504 Outdated Optimize Dep，
//      表现就是「第一次点进列表页白屏，刷新一下才好」。
//
// dts 会生成到 src/types/components.d.ts，让模板里的 <el-xxx> 也能被 TS 识别。
export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      dts: 'src/types/components.d.ts',
    }),
  ],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    open: true,
  },

  build: {
    // 把体积大的第三方库拆出来，避免首屏一个巨大的 chunk。
    // 判断顺序有讲究：@element-plus/icons-vue 里也含 "vue"，
    // 如果先判 vue 会把图标包错分到 vue 那个 chunk 里。
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
          if (id.includes('element-plus')) return 'element'
          if (id.includes('vue') || id.includes('pinia')) return 'vue'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
})
