<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { authApi } from '@/api'
import { useAuthActions } from '@/composables/useAuthActions'
import { ROLE_LABEL, ROLE_TAG_TYPE } from '@/constants'
import { asyncRoutes } from '@/router/routes'
import { useUserStore } from '@/stores/user'
import type { Role } from '@/types'

const userStore = useUserStore()
const { loginAs, logout } = useAuthActions()

const switching = ref<Role | null>(null)

const ROLES: Role[] = ['admin', 'doctor', 'receptionist', 'guest']

/** 所有被权限保护的业务菜单 */
const ALL_MENUS = asyncRoutes.map((route) => ({
  title: route.meta?.title ?? '',
  path: route.path,
  roles: (route.meta?.roles ?? []) as Role[],
}))

/**
 * 菜单权限矩阵直接从路由表推导，而不是手写一份对照表。
 * 手写的话，改了路由的 roles 却忘了改这里，页面就会「说得不对」，
 * 这种文档和实现不一致的坑比没有文档更糟。
 */
const MENU_MATRIX = [
  { title: '数据看板', path: '/dashboard', roles: [...ROLES] },
  ...ALL_MENUS,
]

/** 按钮级权限演示：右边会实时显示当前角色有没有这些权限码 */
const BUTTON_DEMO: { code: string; label: string; type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }[] = [
  { code: 'pet:add', label: '新增档案', type: 'primary' },
  { code: 'pet:edit', label: '编辑档案', type: 'warning' },
  { code: 'pet:delete', label: '删除档案', type: 'danger' },
  { code: 'pet:export', label: '导出数据', type: 'info' },
  { code: 'clinic:manage', label: '门店管理', type: 'success' },
]

const myPermissions = computed(() => userStore.permissions)

const grantedCount = computed(
  () => BUTTON_DEMO.filter((item) => userStore.hasPermission(item.code)).length,
)

async function switchRole(role: Role): Promise<void> {
  if (role === userStore.role) return

  const account = { admin: 'admin', doctor: 'doctor', receptionist: 'reception', guest: 'guest' }[role]
  switching.value = role
  try {
    await logout()
    await loginAs(account, '123456')
    ElMessage.success(`已切换为「${ROLE_LABEL[role]}」`)
  } catch {
    ElMessage.error('切换失败，请重试')
  } finally {
    switching.value = null
  }
}

/** 主动把当前 token 作废，走一遍 401 → 清状态 → 跳登录 的完整链路 */
async function simulateTokenExpired(): Promise<void> {
  try {
    await authApi.expire()
  } catch {
    // 拦截器已经处理了跳转和提示，这里不用再做任何事
  }
}
</script>

<template>
  <div class="page">
    <!-- 当前身份 -->
    <el-card shadow="never" class="page__card">
      <div class="perm__identity">
        <div class="perm__who">
          <el-avatar :size="46" class="perm__avatar">
            {{ userStore.nickname.slice(0, 1) }}
          </el-avatar>
          <div>
            <div class="perm__name">
              {{ userStore.nickname }}
              <el-tag :type="ROLE_TAG_TYPE[userStore.role]" size="small" effect="light">
                {{ userStore.roleName }}
              </el-tag>
            </div>
            <div class="perm__meta">
              数据范围：{{ userStore.clinicName }} ·
              持有权限码 {{ myPermissions.length }} 个
            </div>
          </div>
        </div>

        <el-button type="warning" plain @click="simulateTokenExpired">
          <AppIcon name="Timer" />模拟 token 失效
        </el-button>
      </div>

      <el-alert type="info" :closable="false" show-icon class="perm__alert">
        <template #title>
          点下面的角色按钮可以直接切换身份，左边菜单会立刻跟着变 ——
          这就是「路由级权限」最直观的效果。
        </template>
      </el-alert>

      <div class="perm__switch">
        <el-button
          v-for="role in ROLES"
          :key="role"
          :type="role === userStore.role ? 'primary' : 'default'"
          :loading="switching === role"
          @click="switchRole(role)"
        >
          以「{{ ROLE_LABEL[role] }}」身份体验
        </el-button>
      </div>
    </el-card>

    <!-- 一、路由级权限 -->
    <el-card shadow="never" class="page__card">
      <template #header>
        <div class="perm__header">
          <span class="perm__title">一、路由级权限</span>
          <span class="perm__desc">
            无权限的路由根本不会挂进路由表，手敲地址栏也进不去
          </span>
        </div>
      </template>

      <el-table :data="MENU_MATRIX" border stripe>
        <el-table-column prop="title" label="菜单" min-width="130" />

        <el-table-column
          v-for="role in ROLES"
          :key="role"
          :label="ROLE_LABEL[role]"
          align="center"
          min-width="100"
        >
          <template #default="{ row }">
            <AppIcon v-if="row.roles.includes(role)" name="Star" class="perm__yes" />
            <span v-else class="perm__no">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="perm__current-menus">
        当前账号实际挂载的业务菜单：
        <el-tag
          v-for="menu in ALL_MENUS.filter((m) => m.roles.includes(userStore.role))"
          :key="menu.path"
          size="small"
          effect="plain"
          class="perm__menu-tag"
        >
          {{ menu.title }}
        </el-tag>
        <span
          v-if="ALL_MENUS.filter((m) => m.roles.includes(userStore.role)).length === 0"
          class="perm__no"
        >
          无（只剩看板和本页）
        </span>
      </div>
    </el-card>

    <!-- 二、按钮级权限 -->
    <el-card shadow="never" class="page__card">
      <template #header>
        <div class="perm__header">
          <span class="perm__title">二、按钮级权限（v-permission 指令）</span>
          <span class="perm__desc">
            当前角色命中 {{ grantedCount }} / {{ BUTTON_DEMO.length }} 个
          </span>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <div class="perm__subtitle">左侧按钮是 v-permission 渲染的真实效果</div>

          <div class="perm__buttons">
            <el-button
              v-for="item in BUTTON_DEMO"
              :key="item.code"
              v-permission="item.code"
              :type="item.type"
            >
              {{ item.label }}
            </el-button>
          </div>

          <el-alert
            v-if="grantedCount === 0"
            type="warning"
            :closable="false"
            show-icon
            title="当前角色一个按钮权限都没有，所以上面的区域是空的"
          />
          <el-alert
            v-else-if="grantedCount < BUTTON_DEMO.length"
            type="success"
            :closable="false"
            show-icon
            :title="`另外 ${BUTTON_DEMO.length - grantedCount} 个按钮已被指令从 DOM 中移除，不是在 CSS 里藏起来的`"
          />
        </el-col>

        <el-col :xs="24" :md="12">
          <div class="perm__subtitle">右侧是权限码的判定结果</div>

          <el-table :data="BUTTON_DEMO" border size="small">
            <el-table-column prop="label" label="操作" min-width="110" />
            <el-table-column prop="code" label="权限码" min-width="140" />
            <el-table-column label="是否持有" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="userStore.hasPermission(row.code) ? 'success' : 'info'"
                  size="small"
                  effect="light"
                >
                  {{ userStore.hasPermission(row.code) ? '有' : '无' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-card>

    <!-- 三、数据级权限 -->
    <el-card shadow="never" class="page__card">
      <template #header>
        <div class="perm__header">
          <span class="perm__title">三、数据级权限</span>
          <span class="perm__desc">接口按角色返回不同范围的数据</span>
        </div>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="当前角色">{{ userStore.roleName }}</el-descriptions-item>
        <el-descriptions-item label="可见门店范围">
          {{ userStore.clinicName }}
        </el-descriptions-item>
        <el-descriptions-item label="说明">
          <span v-if="userStore.role === 'admin'">
            管理员不受门店限制，能看到全部 {{ ALL_MENUS.length }} 个业务模块的数据。
          </span>
          <span v-else-if="userStore.userInfo?.clinicId">
            账号绑定了门店，列表接口在下发数据前就按门店过滤过，
            前端拿到的本来就只有本店记录 —— 不是在页面上筛掉的。
          </span>
          <span v-else>该角色没有绑定门店，也无业务数据访问权。</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-alert type="warning" :closable="false" show-icon class="perm__alert">
        <template #title>
          重要：前端的权限控制只是体验层。任何人都能在浏览器里改 JS 绕过 v-permission，
          所以真正的校验必须在后端按同一套权限码再判一次。
          这个 demo 里的 mock 接口就是按这个原则写的 —— 拿前台的 token 调删除接口会返回 403。
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<style scoped>
.perm__identity {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.perm__who {
  display: flex;
  align-items: center;
  gap: 12px;
}

.perm__avatar {
  background: var(--el-color-primary);
  color: #fff;
  font-size: 18px;
}

.perm__name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.perm__meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.perm__alert {
  margin-top: 16px;
  border-radius: var(--app-radius);
}

.perm__switch {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.perm__header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.perm__title {
  font-size: 15px;
  font-weight: 600;
}

.perm__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.perm__subtitle {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.perm__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 40px;
  margin-bottom: 16px;
}

.perm__yes {
  color: var(--el-color-success);
}

.perm__no {
  color: var(--el-text-color-placeholder);
}

.perm__current-menus {
  margin-top: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.perm__menu-tag {
  margin-left: 6px;
}
</style>
