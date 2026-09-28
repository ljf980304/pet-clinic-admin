import type { App, Directive } from 'vue'
import { useUserStore } from '@/stores/user'

/**
 * 按钮级权限指令。
 *
 *   <el-button v-permission="'pet:add'">新增</el-button>
 *   <el-button v-permission="['pet:edit', 'pet:delete']">编辑</el-button>
 *
 * 传数组时是「或」的关系。没有权限的元素直接从 DOM 里摘掉，
 * 而不是 display:none —— 后者在开发者工具里删掉样式就能点，给人虚假的安全感。
 *
 * 再强调一次：这只是体验层的控制。真正的权限校验必须在后端做，
 * 否则任何人改一下前端代码就能绕过。
 */
const permission: Directive<HTMLElement, string | string[] | undefined> = {
  mounted(el, binding) {
    const userStore = useUserStore()
    if (!userStore.hasPermission(binding.value)) {
      el.parentNode?.removeChild(el)
    }
  },
}

export function setupDirectives(app: App): void {
  app.directive('permission', permission)
}
