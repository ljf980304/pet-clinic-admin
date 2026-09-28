const TOKEN_KEY = 'pet-clinic-token'

/**
 * token 存 localStorage 而不是只放内存，是为了刷新页面不掉登录态。
 * demo 里用的是假 token，真实项目里这里可以换成 httpOnly cookie 方案。
 */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
