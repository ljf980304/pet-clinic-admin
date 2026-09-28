import axios, {
  AxiosError,
  type AxiosAdapter,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import { dispatchMock } from '@/mock'
import { getToken } from '@/utils/auth'

/** 后端统一响应结构 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 调用方可以通过 config 上的这两个字段微调行为 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    /** 静默模式：不自动弹错误提示，由调用方自己处理 */
    silent?: boolean
  }
}

/* ------------------------------------------------------------------ */
/* 401 的处理做成回调注册                                             */
/* ------------------------------------------------------------------ */

type UnauthorizedHandler = (message: string) => void

let onUnauthorized: UnauthorizedHandler | null = null

/**
 * 这里不直接 import router / store，是为了避免
 * request → router → store → api → request 的循环依赖。
 * 由 main.ts 在启动时注入具体实现。
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler
}

/* ------------------------------------------------------------------ */
/* 把请求转发给本地 mock                                               */
/* ------------------------------------------------------------------ */

function normalizeQuery(params: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!params || typeof params !== 'object') return out
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    // 空字符串要丢掉：否则「全部」这种默认选项会被当成一个真实的筛选条件发给后端
    if (value === undefined || value === null || value === '') continue
    out[key] = String(value)
  }
  return out
}

function parseBody(data: unknown): unknown {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

function extractToken(config: AxiosRequestConfig): string {
  const headers = config.headers as Record<string, unknown> | undefined
  const auth = headers?.['Authorization']
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length)
  }
  return getToken()
}

const mockAdapter: AxiosAdapter = async (config) => {
  const result = await dispatchMock({
    url: config.url ?? '',
    method: config.method ?? 'get',
    query: normalizeQuery(config.params),
    body: parseBody(config.data),
    token: extractToken(config),
  })

  const response: AxiosResponse = {
    data: result.body,
    status: result.status,
    statusText: String(result.status),
    headers: {},
    config: config as InternalAxiosRequestConfig,
  }

  if (result.status >= 200 && result.status < 300) {
    return response
  }

  // 非 2xx 要走 reject，这样才和真实 axios 的行为一致，
  // 拦截器的错误分支才会被触发。
  throw new AxiosError(
    result.body.message,
    String(result.status),
    config as InternalAxiosRequestConfig,
    undefined,
    response,
  )
}

/* ------------------------------------------------------------------ */
/* 实例与拦截器                                                        */
/* ------------------------------------------------------------------ */

const instance = axios.create({
  baseURL: '/',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  adapter: mockAdapter,
})

instance.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

instance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const serverMessage = error.response?.data?.message

    let message = serverMessage ?? '网络异常，请稍后重试'

    if (!error.response) {
      // 没有 response 说明请求根本没发出去
      message = '网络连接失败，请检查网络后重试'
    } else if (status === 401) {
      message = serverMessage ?? '登录已过期，请重新登录'
      onUnauthorized?.(message)
    }

    if (!(error.config as AxiosRequestConfig | undefined)?.silent) {
      ElMessage.error(message)
    }

    return Promise.reject(new Error(message))
  },
)

/**
 * 所有业务请求的统一入口。
 * 泛型 T 描述的是 data 字段的类型，不是整个响应体 —— 调用方不用再层层 .data。
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request<ApiResponse<T>>(config)
  return response.data.data
}

export default instance
