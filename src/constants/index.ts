import type { PetSpecies, PetStatus, Role } from '@/types'

/** 下拉选项和中文标签集中管理，避免散落在各个页面里，改一处就能全局生效。 */

export const SPECIES_OPTIONS: { label: string; value: PetSpecies }[] = [
  { label: '犬', value: 'dog' },
  { label: '猫', value: 'cat' },
  { label: '其他', value: 'other' },
]

export const SPECIES_LABEL: Record<PetSpecies, string> = {
  dog: '犬',
  cat: '猫',
  other: '其他',
}

/**
 * 品种按物种联动。
 * 表单页里「物种」一变，品种下拉的可选项和已选值都要跟着变。
 */
export const BREED_OPTIONS: Record<PetSpecies, string[]> = {
  dog: [
    '金毛寻回犬',
    '柯基',
    '泰迪',
    '边境牧羊犬',
    '哈士奇',
    '拉布拉多',
    '萨摩耶',
    '比熊',
    '柴犬',
    '腊肠',
  ],
  cat: ['布偶猫', '英国短毛猫', '美国短毛猫', '暹罗猫', '波斯猫', '缅因猫', '橘猫', '狸花猫'],
  other: ['兔子', '仓鼠', '龙猫', '鹦鹉', '巴西龟'],
}

export const STATUS_OPTIONS: { label: string; value: PetStatus }[] = [
  { label: '健康', value: 'healthy' },
  { label: '治疗中', value: 'treating' },
  { label: '留观', value: 'observation' },
  { label: '已出院', value: 'discharged' },
]

export const STATUS_LABEL: Record<PetStatus, string> = {
  healthy: '健康',
  treating: '治疗中',
  observation: '留观',
  discharged: '已出院',
}

/** 表格里状态列的 tag 颜色 */
export const STATUS_TAG_TYPE: Record<PetStatus, 'success' | 'warning' | 'danger' | 'info'> = {
  healthy: 'success',
  treating: 'danger',
  observation: 'warning',
  discharged: 'info',
}

export const GENDER_LABEL: Record<'male' | 'female', string> = {
  male: '公',
  female: '母',
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理员',
  doctor: '医生',
  receptionist: '前台',
  guest: '访客',
}

export const ROLE_TAG_TYPE: Record<Role, 'danger' | 'success' | 'warning' | 'info'> = {
  admin: 'danger',
  doctor: 'success',
  receptionist: 'warning',
  guest: 'info',
}

/** 演示用的固定账号，登录页会把它预填进输入框 */
export const DEMO_ACCOUNTS: { role: Role; username: string; password: string; desc: string }[] = [
  { role: 'admin', username: 'admin', password: '123456', desc: '全部菜单 + 全部按钮' },
  { role: 'doctor', username: 'doctor', password: '123456', desc: '可编辑，不能删除' },
  { role: 'receptionist', username: 'reception', password: '123456', desc: '只读，无编辑入口' },
  { role: 'guest', username: 'guest', password: '123456', desc: '仅看板，无业务菜单' },
]
