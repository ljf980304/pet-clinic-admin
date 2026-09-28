import type { Router } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import { catchAllRoute } from './routes'

/** 不需要登录就能访问的路径 */
const WHITE_LIST = ['/login', '/404']

export function setupRouterGuard(router: Router): void {
  router.beforeEach(async (to) => {
    const userStore = useUserStore()
    const permissionStore = usePermissionStore()

    // 未登录
    if (!userStore.isLoggedIn) {
      if (WHITE_LIST.includes(to.path)) return true
      return {
        path: '/login',
        query: to.fullPath === '/' ? {} : { redirect: to.fullPath },
      }
    }

    // 已登录还想去登录页，直接送回首页
    if (to.path === '/login') return { path: '/' }

    // 刷新页面后 pinia 是空的，但 token 还在 localStorage 里。
    // 这时要重新拉一次用户信息，并按新拿到的角色重建动态路由。
    if (!userStore.userInfo) {
      try {
        const info = await userStore.fetchProfile()
        const accessible = permissionStore.generateRoutes(info.role)

        accessible.forEach((route) => router.addRoute(route))
        if (!router.hasRoute('CatchAll')) router.addRoute(catchAllRoute)

        // 动态路由是刚刚才挂上去的，本次导航用的还是旧路由表，
        // 必须重新走一次才能匹配到。replace 是为了不留下历史记录。
        return { path: to.path, query: to.query, hash: to.hash, replace: true }
      } catch {
        userStore.reset()
        permissionStore.reset()
        return { path: '/login', query: { redirect: to.fullPath } }
      }
    }

    return true
  })

  router.afterEach((to) => {
    const title = to.meta.title
    document.title = title ? `${title} · 宠物诊所管理后台` : '宠物诊所管理后台'
  })
}
