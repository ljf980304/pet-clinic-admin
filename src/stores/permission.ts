import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import { asyncRoutes, constantRoutes } from '@/router/routes'
import type { Role } from '@/types'

/**
 * 递归过滤路由。
 * 关键点是「父路由被过滤掉时子路由也一起没了」——
 * 所以要先判断父级，再决定要不要递归处理 children。
 */
function filterRoutesByRole(routes: RouteRecordRaw[], role: Role): RouteRecordRaw[] {
  const result: RouteRecordRaw[] = []

  for (const route of routes) {
    const allowedRoles = route.meta?.roles
    const allowed = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(role)
    if (!allowed) continue

    // 复制一份，避免过滤过程中改到原始的路由表
    const cloned: RouteRecordRaw = { ...route }
    if (cloned.children?.length) {
      cloned.children = filterRoutesByRole(cloned.children, role)
    }
    result.push(cloned)
  }

  return result
}

export const usePermissionStore = defineStore('permission', () => {
  /** 当前角色可访问的全部路由，侧边栏菜单直接渲染它 */
  const routes = ref<RouteRecordRaw[]>([])
  /** 本次动态添加的路由，登出时按这些记录逐条移除 */
  const addedRoutes = ref<RouteRecordRaw[]>([])

  function generateRoutes(role: Role): RouteRecordRaw[] {
    const accessible = filterRoutesByRole(asyncRoutes, role)
    routes.value = [...constantRoutes, ...accessible]
    addedRoutes.value = accessible
    return accessible
  }

  function reset(): void {
    routes.value = []
    addedRoutes.value = []
  }

  return { routes, addedRoutes, generateRoutes, reset }
})
