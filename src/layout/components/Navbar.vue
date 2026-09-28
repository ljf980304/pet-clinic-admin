<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthActions } from '@/composables/useAuthActions'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { DEMO_ACCOUNTS, ROLE_LABEL, ROLE_TAG_TYPE } from '@/constants'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import type { Role } from '@/types'
// 显式引入：它在 layout/components 下，不在 unplugin 默认扫描的 src/components 里
import Breadcrumb from './Breadcrumb.vue'

const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()
const { loginAs, logout } = useAuthActions()

const isNarrow = useMediaQuery('(max-width: 768px)')

/** 宽屏是折叠/展开侧边栏，窄屏是开关抽屉 —— 同一个按钮，两种行为 */
function handleToggleSidebar(): void {
  if (isNarrow.value) appStore.toggleMobileMenu()
  else appStore.toggleSidebar()
}

const toggleIcon = computed(() => {
  if (isNarrow.value) return 'Expand'
  return appStore.sidebarCollapsed ? 'Expand' : 'Fold'
})

const toggleTitle = computed(() => {
  if (isNarrow.value) return '打开菜单'
  return appStore.sidebarCollapsed ? '展开菜单' : '收起菜单'
})

/** 昵称首字做头像，省掉一个图片请求，也不用担心外链挂掉 */
const avatarText = computed(() => userStore.nickname.slice(0, 1) || '?')

const switchableRoles = computed(() => DEMO_ACCOUNTS.filter((item) => item.role !== userStore.role))

async function handleCommand(command: string): Promise<void> {
  if (command === 'profile') {
    await router.push('/profile')
    return
  }

  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        type: 'warning',
        confirmButtonText: '退出',
        cancelButtonText: '取消',
      })
    } catch {
      return // 用户点了取消
    }
    await logout()
    ElMessage.success('已退出登录')
    await router.replace('/login')
    return
  }

  if (command.startsWith('role:')) {
    await switchRole(command.slice('role:'.length) as Role)
  }
}

/**
 * 顶栏直接换角色。
 * 真实项目里这当然不存在 —— 它只是为了让人打开 demo 时
 * 不用退回登录页就能看到权限差异。
 */
async function switchRole(role: Role): Promise<void> {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role)
  if (!account) return

  try {
    await logout()
    await loginAs(account.username, account.password)
    ElMessage.success(`已切换为「${ROLE_LABEL[role]}」`)
    // 换角色后菜单会变，回到看板避免停在当前角色进不去的页面上
    await router.replace('/dashboard')
  } catch {
    ElMessage.error('切换角色失败')
  }
}
</script>

<template>
  <div class="navbar">
    <el-button class="navbar__toggle" text :title="toggleTitle" @click="handleToggleSidebar">
      <AppIcon :name="toggleIcon" />
    </el-button>

    <Breadcrumb />

    <div class="navbar__spacer" />

    <el-tooltip :content="appStore.isDark ? '切换到亮色' : '切换到暗色'" placement="bottom">
      <el-button class="navbar__toggle" text @click="appStore.toggleDark()">
        <AppIcon :name="appStore.isDark ? 'Sunny' : 'Moon'" />
      </el-button>
    </el-tooltip>

    <el-tag :type="ROLE_TAG_TYPE[userStore.role]" size="small" effect="light" class="navbar__role">
      {{ userStore.roleName }}
    </el-tag>

    <el-dropdown trigger="click" @command="handleCommand">
      <div class="navbar__user">
        <el-avatar :size="30" class="navbar__avatar">{{ avatarText }}</el-avatar>
        <span class="navbar__name">{{ userStore.nickname }}</span>
        <AppIcon name="ArrowDown" />
      </div>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item disabled>
            <span class="navbar__meta">{{ userStore.clinicName }}</span>
          </el-dropdown-item>
          <el-dropdown-item command="profile" divided>
            <AppIcon name="User" />个人中心
          </el-dropdown-item>

          <el-dropdown-item
            v-for="item in switchableRoles"
            :key="item.role"
            :command="`role:${item.role}`"
          >
            <AppIcon name="SwitchButton" />切换为{{ ROLE_LABEL[item.role] }}
          </el-dropdown-item>

          <el-dropdown-item command="logout" divided>
            <AppIcon name="SwitchButton" />退出登录
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 56px;
  padding: 0 12px;
}

.navbar__toggle {
  font-size: 18px;
  color: var(--el-text-color-regular);
}

.navbar__spacer {
  flex: 1;
}

.navbar__role {
  flex-shrink: 0;
}

.navbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--el-text-color-regular);
  outline: none;
  transition: background 0.18s ease;
}

.navbar__user:hover {
  background: var(--el-fill-color-light);
}

.navbar__avatar {
  background: var(--el-color-primary);
  color: #fff;
  font-size: 13px;
}

.navbar__name {
  font-size: 13px;
}

.navbar__meta {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

@media (max-width: 768px) {
  .navbar__name {
    display: none;
  }
}
</style>
