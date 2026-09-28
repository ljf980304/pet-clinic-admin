import type { RouteRecordRaw } from 'vue-router'
import Layout from '@/layout/index.vue'

/**
 * 静态路由：不需要权限判断的页面。
 * 登录页、404、以及所有角色都该看到的看板和个人中心放在这里。
 */
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在', hidden: true },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据看板', icon: 'DataLine', keepAlive: true },
      },
    ],
  },
  {
    path: '/profile',
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'Profile',
        component: () => import('@/views/profile/index.vue'),
        meta: { title: '个人中心', icon: 'User', hidden: true },
      },
    ],
  },
]

/**
 * 动态路由：meta.roles 决定哪些角色能拿到它。
 * 登录后由 stores/permission.ts 按角色过滤，再逐条 addRoute 挂进去。
 *
 * 这样做的好处是：无权限的路由**根本不存在于路由表里**，
 * 用户手敲地址栏也进不去 —— 比「进去了再弹一个 403」安全得多。
 */
export const asyncRoutes: RouteRecordRaw[] = [
  {
    path: '/pet',
    name: 'PetRoot',
    component: Layout,
    redirect: '/pet/list',
    meta: {
      title: '宠物档案',
      icon: 'Collection',
      roles: ['admin', 'doctor', 'receptionist'],
    },
    children: [
      {
        path: 'list',
        name: 'PetList',
        component: () => import('@/views/pet/list.vue'),
        meta: { title: '档案列表', icon: 'List', keepAlive: true },
      },
      {
        // 新增和编辑共用同一个组件，靠路由上是 create 还是 :id/edit 决定模式
        path: 'create',
        name: 'PetCreate',
        component: () => import('@/views/pet/form.vue'),
        meta: { title: '新增档案', icon: 'Plus', hidden: true },
      },
      {
        path: ':id/edit',
        name: 'PetEdit',
        component: () => import('@/views/pet/form.vue'),
        meta: { title: '编辑档案', hidden: true },
      },
    ],
  },
  {
    path: '/clinic',
    name: 'ClinicRoot',
    component: Layout,
    redirect: '/clinic/index',
    meta: { title: '门店管理', icon: 'OfficeBuilding', roles: ['admin'] },
    children: [
      {
        path: 'index',
        name: 'ClinicManage',
        component: () => import('@/views/clinic/index.vue'),
        meta: { title: '门店列表', icon: 'OfficeBuilding' },
      },
    ],
  },
  {
    path: '/permission',
    name: 'PermissionRoot',
    component: Layout,
    redirect: '/permission/index',
    meta: { title: '权限演示', icon: 'Lock', roles: ['admin', 'doctor', 'receptionist', 'guest'] },
    children: [
      {
        path: 'index',
        name: 'PermissionDemo',
        component: () => import('@/views/permission/index.vue'),
        meta: { title: '权限演示', icon: 'Lock' },
      },
    ],
  },
]

/**
 * 兜底路由。
 * 必须等动态路由都挂完再加，否则它会抢先匹配掉 /pet 这类路径 ——
 * 这是动态路由方案里最容易踩的坑。
 */
export const catchAllRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'CatchAll',
  redirect: '/404',
  meta: { hidden: true },
}
