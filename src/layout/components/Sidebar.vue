<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'

interface MenuNode {
  path: string
  title: string
  icon?: string
  children?: MenuNode[]
}

/**
 * collapsed 不传时跟随全局折叠状态；
 * 放进抽屉时由父组件显式传 false，因为抽屉里本来就该是展开的。
 */
const props = defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const route = useRoute()
const appStore = useAppStore()
const permissionStore = usePermissionStore()

const isCollapsed = computed(() => props.collapsed ?? appStore.sidebarCollapsed)

const activeMenu = computed(() => route.path)

/** 把父子路径拼成完整路径：('/pet', 'list') → '/pet/list' */
function joinPath(parent: string, child: string): string {
  if (child.startsWith('/')) return child
  if (!child) return parent
  return `${parent.replace(/\/+$/, '')}/${child}`
}

const menuItems = computed<MenuNode[]>(() => {
  const nodes: MenuNode[] = []

  for (const item of permissionStore.routes) {
    if (item.meta?.hidden) continue

    const children = (item.children ?? []).filter((child) => !child.meta?.hidden)
    if (children.length === 0) continue

    // 只有一个子菜单时，不做成「要先展开才能点」的分组，直接平铺成一级菜单更顺手
    if (children.length === 1) {
      const only = children[0] as RouteRecordRaw
      nodes.push({
        path: joinPath(item.path, only.path),
        title: only.meta?.title ?? item.meta?.title ?? '',
        icon: only.meta?.icon ?? item.meta?.icon,
      })
      continue
    }

    nodes.push({
      path: item.path,
      title: item.meta?.title ?? '',
      icon: item.meta?.icon,
      children: children.map((child) => ({
        path: joinPath(item.path, child.path),
        title: child.meta?.title ?? '',
        icon: child.meta?.icon,
      })),
    })
  }

  return nodes
})
</script>

<template>
  <div class="sidebar">
    <div class="sidebar__brand">
      <img class="sidebar__logo" src="/favicon.svg" alt="logo" />
      <transition name="fade">
        <span v-show="!isCollapsed" class="sidebar__name">宠物诊所后台</span>
      </transition>
    </div>

    <el-scrollbar class="sidebar__scroll">
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="false"
        unique-opened
        router
        class="sidebar__menu"
        @select="emit('navigate')"
      >
        <template v-for="item in menuItems" :key="item.path">
          <el-menu-item v-if="!item.children" :index="item.path">
            <AppIcon :name="item.icon" />
            <template #title>{{ item.title }}</template>
          </el-menu-item>

          <el-sub-menu v-else :index="item.path">
            <template #title>
              <AppIcon :name="item.icon" />
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
              <AppIcon :name="child.icon" />
              <template #title>{{ child.title }}</template>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sidebar-bg);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 56px;
  padding: 0 18px;
  white-space: nowrap;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.sidebar__logo {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
}

.sidebar__name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.sidebar__scroll {
  flex: 1;
  min-height: 0;
}

.sidebar__menu {
  border-right: none;
  background: transparent;
}

.sidebar__menu :deep(.el-menu-item),
.sidebar__menu :deep(.el-sub-menu__title) {
  color: rgb(255 255 255 / 70%);
}

.sidebar__menu :deep(.el-menu-item:hover),
.sidebar__menu :deep(.el-sub-menu__title:hover) {
  color: #fff;
  background: rgb(255 255 255 / 8%);
}

.sidebar__menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: var(--el-color-primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
