import { accounts, dashboard, pets, clinics, type Account } from './db'
import type { Pet, PetStatus } from '@/types'

/**
 * 自建的 mock 服务层。
 *
 * 为什么不用 vite-plugin-mock：那类插件通常只在 dev server 里生效，
 * 打包成静态文件后接口会全部 404 —— 而这个 demo 是要部署到 Vercel 给别人点的。
 * 这里直接在 axios 的 adapter 层拦截，dev 和线上跑的是同一套逻辑。
 */

export interface MockRequest {
  url: string
  method: string
  query: Record<string, string>
  body: unknown
  token: string
}

export interface MockResult {
  status: number
  body: {
    code: number
    message: string
    data: unknown
  }
}

interface MockContext {
  params: Record<string, string>
  query: Record<string, string>
  body: unknown
  token: string
}

interface Route {
  method: string
  pattern: string
  handler: (ctx: MockContext) => MockResult
  /** 默认需要登录，置 false 表示公开接口 */
  auth?: boolean
  /** 需要的权限码，不填表示登录即可访问 */
  permission?: string
}

/* ------------------------------------------------------------------ */
/* 工具                                                                */
/* ------------------------------------------------------------------ */

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ok(data: unknown, message = 'ok'): MockResult {
  return { status: 200, body: { code: 0, message, data } }
}

function fail(status: number, message: string): MockResult {
  return { status, body: { code: status, message, data: null } }
}

/** 把 /api/pets/:id 和 /api/pets/1001 匹配起来，返回 { id: '1001' } */
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pSegments = pattern.split('/').filter(Boolean)
  const uSegments = path.split('/').filter(Boolean)
  if (pSegments.length !== uSegments.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < pSegments.length; i++) {
    const p = pSegments[i] as string
    const u = uSegments[i] as string
    if (p.startsWith(':')) {
      params[p.slice(1)] = decodeURIComponent(u)
    } else if (p !== u) {
      return null
    }
  }
  return params
}

/* ------------------------------------------------------------------ */
/* 伪造 token                                                          */
/* ------------------------------------------------------------------ */

const TOKEN_PREFIX = 'mock-token'
/** 有效期 7 天。演示「token 失效自动跳登录」时，用页面上的按钮手动作废即可。 */
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000

export function issueToken(username: string): string {
  return `${TOKEN_PREFIX}.${btoa(username)}.${Date.now()}`
}

function parseToken(token: string): { username: string; issuedAt: number } | null {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null
  try {
    const username = atob(parts[1] as string)
    const issuedAt = Number(parts[2])
    if (!username || Number.isNaN(issuedAt)) return null
    return { username, issuedAt }
  } catch {
    return null
  }
}

function currentUser(ctx: MockContext): Account | null {
  const parsed = parseToken(ctx.token)
  if (!parsed) return null
  if (Date.now() - parsed.issuedAt > TOKEN_TTL) return null
  return accounts.find((a) => a.username === parsed.username) ?? null
}

/* ------------------------------------------------------------------ */
/* 接口实现                                                            */
/* ------------------------------------------------------------------ */

function login(ctx: MockContext): MockResult {
  const { username, password } = (ctx.body ?? {}) as { username?: string; password?: string }
  const account = accounts.find((a) => a.username === username)

  if (!account || account.password !== password) {
    return fail(400, '账号或密码错误')
  }

  const { password: _ignored, ...user } = account
  return ok({ token: issueToken(account.username), user }, '登录成功')
}

function profile(ctx: MockContext): MockResult {
  const account = currentUser(ctx)
  if (!account) return fail(401, '登录已过期，请重新登录')
  const { password: _ignored, ...user } = account
  return ok(user)
}

/** 演示用：把 token 的签发时间改成很久以前，下次请求就会拿到 401 */
function expireToken(): MockResult {
  return fail(401, '登录状态已失效（演示），请重新登录')
}

function petClause(text: string | undefined): string {
  return (text ?? '').trim().toLowerCase()
}

function listPets(ctx: MockContext): MockResult {
  const q = ctx.query
  const user = currentUser(ctx)
  let rows = pets.slice()

  // 数据级权限：绑定了门店的账号只能看到本店数据。
  // 前端的菜单/按钮隐藏只是体验优化，真正兜底的是这一层 —— 后端也必须这么做。
  if (user?.clinicId) {
    rows = rows.filter((p) => p.clinicId === user.clinicId)
  }

  const keyword = petClause(q.keyword)
  if (keyword) {
    rows = rows.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.ownerName.toLowerCase().includes(keyword) ||
        p.ownerPhone.includes(keyword),
    )
  }

  if (q.species) rows = rows.filter((p) => p.species === q.species)
  if (q.status) rows = rows.filter((p) => p.status === q.status)
  if (q.clinicId) rows = rows.filter((p) => p.clinicId === Number(q.clinicId))
  if (q.startDate) rows = rows.filter((p) => p.lastVisit >= (q.startDate as string))
  if (q.endDate) rows = rows.filter((p) => p.lastVisit <= (q.endDate as string))

  const sortBy = q.sortBy as keyof Pet | undefined
  if (sortBy) {
    const direction = q.sortOrder === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      const av = a[sortBy]
      const bv = b[sortBy]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction
      return String(av).localeCompare(String(bv), 'zh-CN') * direction
    })
  } else {
    // 默认按最近就诊倒序
    rows.sort((a, b) => b.lastVisit.localeCompare(a.lastVisit))
  }

  const page = Number(q.page ?? 1)
  const pageSize = Number(q.pageSize ?? 10)
  const total = rows.length
  const list = rows.slice((page - 1) * pageSize, page * pageSize)

  return ok({ list, total, page, pageSize })
}

function getPet(ctx: MockContext): MockResult {
  const id = Number(ctx.params.id)
  const pet = pets.find((p) => p.id === id)
  if (!pet) return fail(404, '宠物档案不存在')
  return ok(pet)
}

interface PetPayload {
  name?: string
  species?: Pet['species']
  breed?: string
  gender?: Pet['gender']
  age?: number
  weight?: number
  ownerName?: string
  ownerPhone?: string
  status?: PetStatus
  clinicId?: number
  note?: string
  vaccines?: Pet['vaccines']
}

function createPet(ctx: MockContext): MockResult {
  const payload = (ctx.body ?? {}) as PetPayload
  if (!payload.name || !payload.ownerName) {
    return fail(400, '宠物名称和主人姓名为必填项')
  }
  if (payload.ownerPhone && !/^1[3-9]\d{9}$/.test(payload.ownerPhone)) {
    return fail(400, '手机号格式不正确')
  }

  const nextId = Math.max(...pets.map((p) => p.id)) + 1
  const pet: Pet = {
    id: nextId,
    name: payload.name,
    species: payload.species ?? 'dog',
    breed: payload.breed ?? '',
    gender: payload.gender ?? 'male',
    age: payload.age ?? 0,
    weight: payload.weight ?? 0,
    ownerName: payload.ownerName,
    ownerPhone: payload.ownerPhone ?? '',
    lastVisit: new Date().toISOString().slice(0, 10),
    nextVaccine: '',
    status: payload.status ?? 'healthy',
    clinicId: payload.clinicId ?? 1,
    note: payload.note ?? '',
    vaccines: payload.vaccines ?? [],
  }
  pets.unshift(pet)
  return ok(pet, '新增成功')
}

function updatePet(ctx: MockContext): MockResult {
  const id = Number(ctx.params.id)
  const index = pets.findIndex((p) => p.id === id)
  if (index === -1) return fail(404, '宠物档案不存在')

  const payload = (ctx.body ?? {}) as PetPayload
  if (payload.ownerPhone && !/^1[3-9]\d{9}$/.test(payload.ownerPhone)) {
    return fail(400, '手机号格式不正确')
  }

  const merged = { ...(pets[index] as Pet), ...payload, id }
  pets[index] = merged
  return ok(merged, '保存成功')
}

function deletePet(ctx: MockContext): MockResult {
  const id = Number(ctx.params.id)
  const index = pets.findIndex((p) => p.id === id)
  if (index === -1) return fail(404, '宠物档案不存在')
  pets.splice(index, 1)
  return ok(null, '删除成功')
}

function batchDelete(ctx: MockContext): MockResult {
  const { ids } = (ctx.body ?? {}) as { ids?: number[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return fail(400, '请先选择要删除的记录')
  }
  for (const id of ids) {
    const index = pets.findIndex((p) => p.id === id)
    if (index !== -1) pets.splice(index, 1)
  }
  return ok(null, `已删除 ${ids.length} 条记录`)
}

function dashboardStats(ctx: MockContext): MockResult {
  const user = currentUser(ctx)
  const scope = user?.clinicId
    ? clinics.filter((c) => c.id === user.clinicId)
    : clinics

  // 门店受限的账号，看板只统计本店
  const cards = dashboard.cards.map((card) =>
    card.key === 'pets' && scope.length < clinics.length
      ? { ...card, value: pets.filter((p) => p.clinicId === scope[0]?.id).length }
      : card,
  )

  return ok({
    cards,
    visitTrend: dashboard.visitTrend,
    speciesDistribution: dashboard.speciesDistribution,
    clinicPerformance: dashboard.clinicPerformance,
  })
}

/* ------------------------------------------------------------------ */
/* 路由表                                                              */
/* ------------------------------------------------------------------ */

/**
 * 匹配是按顺序的，所以静态路径要写在 :id 这类动态路径前面，
 * 否则 /api/pets/export 会被 /api/pets/:id 抢先匹配掉。
 */
const routes: Route[] = [
  { method: 'POST', pattern: '/api/auth/login', handler: login, auth: false },
  { method: 'POST', pattern: '/api/auth/logout', handler: () => ok(null, '已退出登录'), auth: false },
  { method: 'GET', pattern: '/api/auth/profile', handler: profile },
  { method: 'POST', pattern: '/api/auth/expire', handler: expireToken },

  { method: 'GET', pattern: '/api/dashboard/stats', handler: dashboardStats },

  { method: 'GET', pattern: '/api/clinics', handler: () => ok(clinics) },

  {
    method: 'GET',
    pattern: '/api/pets',
    handler: listPets,
    permission: 'pet:view',
  },
  {
    method: 'POST',
    pattern: '/api/pets/batch-delete',
    handler: batchDelete,
    permission: 'pet:delete',
  },
  { method: 'GET', pattern: '/api/pets/:id', handler: getPet, permission: 'pet:view' },
  { method: 'POST', pattern: '/api/pets', handler: createPet, permission: 'pet:add' },
  { method: 'PUT', pattern: '/api/pets/:id', handler: updatePet, permission: 'pet:edit' },
  { method: 'DELETE', pattern: '/api/pets/:id', handler: deletePet, permission: 'pet:delete' },
]

/**
 * 唯一的对外入口。axios 的自定义 adapter 调用它，拿到结果后包成 AxiosResponse。
 */
export async function dispatchMock(request: MockRequest): Promise<MockResult> {
  // 模拟网络延迟，让 loading 态、骨架屏这些是真的能看到，而不是一闪而过
  await sleep(180 + Math.floor(Math.random() * 300))

  const method = request.method.toUpperCase()

  for (const route of routes) {
    if (route.method !== method) continue

    const params = matchPath(route.pattern, request.url)
    if (!params) continue

    const ctx: MockContext = {
      params,
      query: request.query,
      body: request.body,
      token: request.token,
    }

    if (route.auth !== false) {
      const user = currentUser(ctx)
      if (!user) return fail(401, '登录已过期，请重新登录')
      if (route.permission && !user.permissions.includes(route.permission)) {
        // 注意 403 和 401 的区别：401 是没登录，403 是登录了但没权限。
        // 前端对这两种情况的处理完全不同，不能混。
        return fail(403, '当前角色没有该操作的权限')
      }
    }

    return route.handler(ctx)
  }

  return fail(404, `接口不存在：${method} ${request.url}`)
}
