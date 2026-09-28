import { useRouter } from 'vue-router'
import { authApi } from '@/api'
import { catchAllRoute } from '@/router/routes'
import { resetDynamicRoutes } from '@/router/helpers'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'
import type { Role, UserInfo } from '@/types'

/**
 * 「登录后挂载路由」和「登出后清理状态」这两件事，
 * 登录页、顶栏切换角色、主动作废 token 三处都要用，所以抽出来。
 */
export function useAuthActions() {
  const router = useRouter()
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  /** 按角色把动态路由挂上去，并补上兜底路由（必须在动态路由之后） */
  function mountRoutes(role: Role): void {
    const accessible = permissionStore.generateRoutes(role)
    accessible.forEach((route) => router.addRoute(route))

    if (!router.hasRoute(catchAllRoute.name as string)) {
      router.addRoute(catchAllRoute)
    }
  }

  async function loginAs(username: string, password: string): Promise<UserInfo> {
    const info = await userStore.login({ username, password })
    mountRoutes(info.role)
    return info
  }

  /**
   * 清登录态。
   * 先清动态路由再清 store —— 顺序反过来的话，
   * 清理过程里若触发导航会读到已经空掉的 store。
   */
  async function logout(silent = true): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // token 已经失效时这个请求本来就会失败，忽略即可
    }
    resetDynamicRoutes(router)
    permissionStore.reset()
    userStore.reset()
    void silent
  }

  return { mountRoutes, loginAs, logout }
}
