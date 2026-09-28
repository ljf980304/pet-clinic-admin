import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElLoading, ElMessage } from 'element-plus'

// 样式：Element Plus 全量 CSS + 暗色变量，再叠加自己的全局样式。
// 组件本身走按需引入（见 vite.config.ts），所以这一层不会把 JS 体积也撑大。
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import '@/styles/index.scss'

import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './api/request'
import { setupDirectives } from './directives/permission'
import { resetDynamicRoutes } from './router/helpers'
import { useAppStore } from './stores/app'
import { usePermissionStore } from './stores/permission'
import { useUserStore } from './stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
setupDirectives(app)

/**
 * v-loading 是个指令，不在 unplugin-vue-components 的组件自动引入范围内，
 * 必须显式注册，否则它只会静默失效 —— 不报错，但转圈动画永远不出来。
 */
app.use(ElLoading)

// 主题要在任何页面渲染前应用，否则登录页会先闪一下亮色再变暗
useAppStore(pinia).initTheme()

/**
 * token 失效的统一出口。
 *
 * 这里注入而不是写在 request.ts 内部，是为了避开
 * request → router → layout → ... 的模块循环依赖。
 * 显式传入 pinia 实例，因为这一段跑在组件之外。
 */
setUnauthorizedHandler((message) => {
  const userStore = useUserStore(pinia)
  const permissionStore = usePermissionStore(pinia)

  resetDynamicRoutes(router)
  permissionStore.reset()
  userStore.reset()

  ElMessage.warning(message)
  void router.replace({ path: '/login' })
})

app.mount('#app')
