import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * 响应式媒体查询。
 * 用它而不是靠 CSS 隐藏，是因为「表格」和「卡片流」是两套结构，
 * 不是同一份 DOM 换个样式就能搞定的。
 */
export function useMediaQuery(query: string): Ref<boolean> {
  const matches = ref(false)
  let mql: MediaQueryList | null = null

  const onChange = (event: MediaQueryListEvent): void => {
    matches.value = event.matches
  }

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', onChange)
  })

  onBeforeUnmount(() => {
    mql?.removeEventListener('change', onChange)
    mql = null
  })

  return matches
}
