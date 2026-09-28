import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/api'
import { getToken, removeToken, setToken } from '@/utils/auth'
import type { LoginParams, Role, UserInfo } from '@/types'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(getToken())
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => Boolean(token.value))
  const role = computed<Role>(() => userInfo.value?.role ?? 'guest')
  const roleName = computed(() => userInfo.value?.roleName ?? '')
  const permissions = computed<string[]>(() => userInfo.value?.permissions ?? [])
  const nickname = computed(() => userInfo.value?.nickname ?? '')
  const clinicName = computed(() => userInfo.value?.clinicName ?? '全部门店')

  /**
   * 按钮级权限判断。
   * 传数组时是「或」的关系 —— 满足任意一个即可。
   */
  function hasPermission(required?: string | string[]): boolean {
    if (!required || (Array.isArray(required) && required.length === 0)) return true
    const list = Array.isArray(required) ? required : [required]
    return list.some((code) => permissions.value.includes(code))
  }

  function hasRole(required?: Role | Role[]): boolean {
    if (!required || (Array.isArray(required) && required.length === 0)) return true
    const list = Array.isArray(required) ? required : [required]
    return list.includes(role.value)
  }

  async function login(params: LoginParams): Promise<UserInfo> {
    const result = await authApi.login(params)
    token.value = result.token
    setToken(result.token)
    userInfo.value = result.user
    return result.user
  }

  async function fetchProfile(): Promise<UserInfo> {
    const info = await authApi.profile()
    userInfo.value = info
    return info
  }

  /** 只清本地状态，不发请求 —— token 已经失效时再调 logout 接口没有意义 */
  function reset(): void {
    token.value = ''
    userInfo.value = null
    removeToken()
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    role,
    roleName,
    permissions,
    nickname,
    clinicName,
    hasPermission,
    hasRole,
    login,
    fetchProfile,
    reset,
  }
})
