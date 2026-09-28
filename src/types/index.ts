/**
 * 全局类型定义。
 * 所有跨模块共享的数据结构都集中在这里，避免各层各写一份导致对不上。
 */

/** 角色。权限体系的最小单位是「权限码」，角色只是权限码的预设组合。 */
export type Role = 'admin' | 'doctor' | 'receptionist' | 'guest'

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  role: Role
  roleName: string
  /** 医生 / 前台绑定到具体门店，管理员和访客为 null（可见全部门店） */
  clinicId: number | null
  clinicName: string | null
  permissions: string[]
}

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: UserInfo
}

export type PetSpecies = 'dog' | 'cat' | 'other'
export type PetGender = 'male' | 'female'
export type PetStatus = 'healthy' | 'treating' | 'observation' | 'discharged'

/** 疫苗记录。表单页用它演示「动态增减项」。 */
export interface VaccineRecord {
  name: string
  date: string
}

export interface Pet {
  id: number
  name: string
  species: PetSpecies
  breed: string
  gender: PetGender
  age: number
  weight: number
  ownerName: string
  ownerPhone: string
  lastVisit: string
  nextVaccine: string
  status: PetStatus
  clinicId: number
  note: string
  vaccines: VaccineRecord[]
}

export interface Clinic {
  id: number
  name: string
  city: string
}

export interface PetQuery {
  keyword: string
  species: PetSpecies | ''
  status: PetStatus | ''
  clinicId: number | ''
  dateRange: [string, string] | null
  page: number
  pageSize: number
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export type SortOrder = 'asc' | 'desc'

export interface StatCard {
  key: string
  label: string
  value: number
  unit: string
  /** 环比变化百分比，正数上升、负数下降 */
  delta: number
  icon: string
}

export interface DashboardStats {
  cards: StatCard[]
  visitTrend: {
    dates: string[]
    visits: number[]
    newPets: number[]
  }
  speciesDistribution: { name: string; value: number }[]
  clinicPerformance: {
    clinics: string[]
    revenue: number[]
    target: number[]
  }
}
