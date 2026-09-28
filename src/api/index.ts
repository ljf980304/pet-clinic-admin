import { request } from './request'
import type {
  Clinic,
  DashboardStats,
  LoginParams,
  LoginResult,
  PageResult,
  Pet,
  UserInfo,
} from '@/types'

/**
 * 接口按业务域分组。
 * 组件里只 import 这些函数，不直接碰 axios —— 后面真要接后端，
 * 只需要把这个文件里的地址换掉，页面一行都不用动。
 */

export const authApi = {
  login: (data: LoginParams) =>
    request<LoginResult>({ url: '/api/auth/login', method: 'post', data }),

  profile: () => request<UserInfo>({ url: '/api/auth/profile', method: 'get' }),

  logout: () => request<null>({ url: '/api/auth/logout', method: 'post' }),

  /** 演示用：主动让当前 token 失效，触发 401 → 跳登录的完整链路 */
  expire: () => request<null>({ url: '/api/auth/expire', method: 'post', silent: true }),
}

export interface PetListParams {
  keyword?: string
  species?: string
  status?: string
  clinicId?: number | ''
  startDate?: string
  endDate?: string
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export const petApi = {
  list: (params: PetListParams) =>
    request<PageResult<Pet>>({ url: '/api/pets', method: 'get', params }),

  detail: (id: number) => request<Pet>({ url: `/api/pets/${id}`, method: 'get' }),

  create: (data: Partial<Pet>) => request<Pet>({ url: '/api/pets', method: 'post', data }),

  update: (id: number, data: Partial<Pet>) =>
    request<Pet>({ url: `/api/pets/${id}`, method: 'put', data }),

  remove: (id: number) => request<null>({ url: `/api/pets/${id}`, method: 'delete' }),

  batchRemove: (ids: number[]) =>
    request<null>({ url: '/api/pets/batch-delete', method: 'post', data: { ids } }),
}

export const clinicApi = {
  list: () => request<Clinic[]>({ url: '/api/clinics', method: 'get' }),
}

export const dashboardApi = {
  stats: () => request<DashboardStats>({ url: '/api/dashboard/stats', method: 'get' }),
}
