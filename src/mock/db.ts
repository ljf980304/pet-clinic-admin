import { BREED_OPTIONS } from '@/constants'
import type { Clinic, Pet, PetSpecies, PetStatus, Role, UserInfo } from '@/types'

/**
 * 演示数据源。
 * 用固定种子的伪随机数生成，保证每次刷新拿到的数据完全一致 ——
 * 否则翻页、排序、图表之间会对不上，看起来像 bug。
 */
let seed = 20260928
function rand(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
function randInt(min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1))
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)] as T
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 以 2026-09-28 为基准做日期偏移，保证数据永远落在「最近」的时间窗里 */
export function dateOffset(offsetDays: number): string {
  const d = new Date(2026, 8, 28)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const clinics: Clinic[] = [
  { id: 1, name: '浦东世纪公园店', city: '上海' },
  { id: 2, name: '徐汇衡山路店', city: '上海' },
  { id: 3, name: '静安大宁店', city: '上海' },
]

const PET_NAMES = [
  '豆豆', '团团', '布丁', '芝麻', '汤圆', '可乐', '雪球', '咪咪', '旺财', '毛球',
  '年糕', '花卷', '奶昔', '土豆', '芒果', '奥利奥', '包子', '棉花糖', '小七', '来福',
  '奶盖', '桃桃', '闪电', '元宝', '糯米', '西瓜', '曲奇', '泡芙', '阿黄', '点点',
]

const OWNER_SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '赵', '周', '吴', '徐', '孙', '马', '朱', '胡', '林']
const OWNER_GIVEN = ['伟', '娜', '芳', '洋', '静', '帆', '敏', '杰', '桐', '蕾', '悦', '超', '鑫', '倩', '磊', '婷']

const VACCINE_NAMES = ['狂犬疫苗', '犬瘟热疫苗', '细小病毒疫苗', '猫三联', '猫白血病疫苗', '传染性腹膜炎疫苗']

const NOTES = [
  '性格温顺，配合检查。',
  '对鸡肉过敏，用药需避开。',
  '有轻微皮肤病史，换季需注意。',
  '首次到店，需补录既往病史。',
  '老年犬，麻醉风险较高。',
  '',
  '',
]

function makeVaccines(): Pet['vaccines'] {
  const count = randInt(0, 3)
  const list: Pet['vaccines'] = []
  for (let i = 0; i < count; i++) {
    list.push({
      name: pick(VACCINE_NAMES),
      date: dateOffset(-randInt(30, 700)),
    })
  }
  return list
}

function makePets(count: number): Pet[] {
  const list: Pet[] = []
  for (let i = 1; i <= count; i++) {
    const species: PetSpecies = pick<PetSpecies>(['dog', 'dog', 'dog', 'cat', 'cat', 'other'])
    const clinic = pick(clinics)
    const status: PetStatus = pick<PetStatus>([
      'healthy',
      'healthy',
      'healthy',
      'treating',
      'treating',
      'observation',
      'discharged',
    ])
    list.push({
      id: 1000 + i,
      name: pick(PET_NAMES),
      species,
      breed: pick(BREED_OPTIONS[species]),
      gender: pick<'male' | 'female'>(['male', 'female']),
      age: randInt(1, 15),
      weight: Number((randInt(15, 450) / 10).toFixed(1)),
      ownerName: pick(OWNER_SURNAMES) + pick(OWNER_GIVEN),
      ownerPhone: `13${randInt(100000000, 999999999)}`,
      lastVisit: dateOffset(-randInt(0, 180)),
      nextVaccine: dateOffset(randInt(-20, 120)),
      status,
      clinicId: clinic.id,
      note: pick(NOTES),
      vaccines: makeVaccines(),
    })
  }
  return list
}

export const pets: Pet[] = makePets(86)

/* ------------------------------------------------------------------ */
/* 用户与权限                                                          */
/* ------------------------------------------------------------------ */

/** 权限码全集。新增功能时在这里加一项，然后在角色里勾选。 */
export const ALL_PERMISSIONS = [
  'dashboard:view',
  'pet:view',
  'pet:add',
  'pet:edit',
  'pet:delete',
  'pet:export',
  'pet:vaccine:edit',
  'clinic:view',
  'clinic:manage',
  'staff:view',
  'permission:view',
] as const

/**
 * 角色 → 权限码。
 * 注意：前端的权限只负责「展示层」，真正的拦截必须在后端做。
 * 这里的映射在真实项目里应该由后端下发，而不是前端写死。
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [...ALL_PERMISSIONS],
  doctor: ['dashboard:view', 'pet:view', 'pet:add', 'pet:edit', 'pet:vaccine:edit', 'clinic:view'],
  receptionist: ['dashboard:view', 'pet:view'],
  guest: ['dashboard:view'],
}

export interface Account extends UserInfo {
  password: string
}

export const accounts: Account[] = [
  {
    id: 1,
    username: 'admin',
    password: '123456',
    nickname: '林院长',
    avatar: '',
    role: 'admin',
    roleName: '管理员',
    clinicId: null,
    clinicName: null,
    permissions: ROLE_PERMISSIONS.admin,
  },
  {
    id: 2,
    username: 'doctor',
    password: '123456',
    nickname: '陈医生',
    avatar: '',
    role: 'doctor',
    roleName: '医生',
    clinicId: 1,
    clinicName: clinics[0]?.name ?? '',
    permissions: ROLE_PERMISSIONS.doctor,
  },
  {
    id: 3,
    username: 'reception',
    password: '123456',
    nickname: '周前台',
    avatar: '',
    role: 'receptionist',
    roleName: '前台',
    clinicId: 2,
    clinicName: clinics[1]?.name ?? '',
    permissions: ROLE_PERMISSIONS.receptionist,
  },
  {
    id: 4,
    username: 'guest',
    password: '123456',
    nickname: '访客体验',
    avatar: '',
    role: 'guest',
    roleName: '访客',
    clinicId: null,
    clinicName: null,
    permissions: ROLE_PERMISSIONS.guest,
  },
]

/* ------------------------------------------------------------------ */
/* 看板数据                                                            */
/* ------------------------------------------------------------------ */

export const dashboard = {
  cards: [
    { key: 'visits', label: '今日接诊', value: 47, unit: '次', delta: 12.5, icon: 'FirstAidKit' },
    { key: 'pets', label: '在册宠物', value: pets.length, unit: '只', delta: 4.2, icon: 'Collection' },
    { key: 'vaccine', label: '疫苗待接种', value: 18, unit: '只', delta: -8.3, icon: 'Timer' },
    { key: 'revenue', label: '本月营收', value: 286400, unit: '元', delta: 9.7, icon: 'Money' },
    { key: 'treating', label: '住院中', value: 6, unit: '只', delta: 0, icon: 'Monitor' },
    { key: 'rating', label: '满意度', value: 98.2, unit: '%', delta: 0.6, icon: 'Star' },
  ],

  visitTrend: {
    dates: Array.from({ length: 14 }, (_, i) => dateOffset(i - 13).slice(5)),
    visits: [32, 41, 38, 45, 52, 61, 58, 44, 39, 47, 51, 56, 49, 47],
    newPets: [6, 9, 7, 11, 13, 18, 15, 8, 7, 10, 12, 14, 11, 9],
  },

  speciesDistribution: [
    { name: '犬', value: 46 },
    { name: '猫', value: 31 },
    { name: '其他', value: 9 },
  ],

  clinicPerformance: {
    clinics: clinics.map((c) => c.name.replace(/店$/, '')),
    revenue: [128600, 94200, 63600],
    target: [120000, 100000, 70000],
  },
}
