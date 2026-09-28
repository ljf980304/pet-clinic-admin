import type { Router } from 'vue-router'
import { asyncRoutes, catchAllRoute } from './routes'

/**
 * 移除当前账号动态挂上去的路由。
 *
 * 为什么必须做：路由是在登录后按角色 addRoute 进去的，
 * 如果登出时不清理，换个角色登录后上一个角色的路由还留在表里 ——
 * 新账号手敲地址栏就能进入本来没权限的页面。
 * 移除顶层父路由会连带移除它的所有子路由，所以不用逐个摘。
 *
 * 注意：这里刻意在函数内部才读 asyncRoutes，而不是在模块顶层算好常量。
 * 因为 modules 之间存在环（routes → layout → Navbar → helpers），
 * 顶层求值时 asyncRoutes 可能还处于未初始化状态，会直接抛 ReferenceError。
 */
export function resetDynamicRoutes(router: Router): void {
  const names = asyncRoutes
    .map((route) => route.name)
    .filter((name): name is string => typeof name === 'string')

  for (const name of names) {
    if (router.hasRoute(name)) router.removeRoute(name)
  }

  const catchAllName = catchAllRoute.name as string
  if (router.hasRoute(catchAllName)) router.removeRoute(catchAllName)
}
