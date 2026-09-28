import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

const COLLAPSE_KEY = 'pet-clinic-sidebar-collapsed'
const DARK_KEY = 'pet-clinic-dark'

export const useAppStore = defineStore('app', () => {
  const sidebarCollapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1')
  const isDark = ref(localStorage.getItem(DARK_KEY) === '1')

  /**
   * 窄屏下侧边栏改成抽屉。
   * 如果手机上还让侧边栏常驻，390px 的屏幕会被它吃掉一大半，
   * 正文区只剩一百多像素，卡片和表格全都挤成一列竖排的字。
   */
  const mobileMenuOpen = ref(false)

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleMobileMenu(): void {
    mobileMenuOpen.value = !mobileMenuOpen.value
  }

  function closeMobileMenu(): void {
    mobileMenuOpen.value = false
  }

  function applyDark(): void {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  function toggleDark(): void {
    isDark.value = !isDark.value
    applyDark()
  }

  /** 刷新后要保持上次的主题，所以存起来；进页面时也要立刻应用一次 */
  function initTheme(): void {
    applyDark()
  }

  watch(sidebarCollapsed, (value) => {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  })

  watch(isDark, (value) => {
    localStorage.setItem(DARK_KEY, value ? '1' : '0')
  })

  return {
    sidebarCollapsed,
    isDark,
    mobileMenuOpen,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    toggleDark,
    initTheme,
  }
})
