import 'vue-router'
import type { Role } from './index'

/**
 * 扩展路由 meta 的类型。
 * 不这么做的话 route.meta.title 是 unknown，模板里访问会一直报类型错误。
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 菜单和面包屑里显示的名字 */
    title?: string
    /** 侧边栏图标名，对应 components/AppIcon.vue 里的映射表 */
    icon?: string
    /** 允许访问的角色。不填表示所有登录用户都能访问 */
    roles?: Role[]
    /** 不在侧边栏菜单里显示（例如详情页、编辑页） */
    hidden?: boolean
    /** 是否缓存该页面 */
    keepAlive?: boolean
  }
}
