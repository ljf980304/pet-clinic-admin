<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'
import AppNavbar from './components/Navbar.vue'
import AppSidebar from './components/Sidebar.vue'

const appStore = useAppStore()
const permissionStore = usePermissionStore()

/** 窄屏时侧边栏改为抽屉，把整个宽度让给正文 */
const isNarrow = useMediaQuery('(max-width: 768px)')

onMounted(() => appStore.initTheme())

/** 收集所有标了 keepAlive 的路由名，交给 <keep-alive :include> */
function collectKeepAlive(routes: RouteRecordRaw[], out: string[] = []): string[] {
  for (const route of routes) {
    if (route.meta?.keepAlive && typeof route.name === 'string') out.push(route.name)
    if (route.children?.length) collectKeepAlive(route.children, out)
  }
  return out
}

const cachedViews = computed(() => collectKeepAlive(permissionStore.routes))
</script>

<template>
  <el-container class="layout">
    <!-- 宽屏：常驻侧边栏 -->
    <el-aside
      v-if="!isNarrow"
      class="layout__aside"
      :width="appStore.sidebarCollapsed ? '64px' : '220px'"
    >
      <AppSidebar />
    </el-aside>

    <!-- 窄屏：抽屉，点菜单后自动收起 -->
    <el-drawer
      v-else
      v-model="appStore.mobileMenuOpen"
      direction="ltr"
      :with-header="false"
      size="220px"
      class="layout-drawer"
    >
      <AppSidebar :collapsed="false" @navigate="appStore.closeMobileMenu()" />
    </el-drawer>

    <el-container class="layout__body">
      <el-header class="layout__header">
        <AppNavbar />
      </el-header>

      <el-main class="layout__main">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-slide" mode="out-in">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="route.path" />
            </keep-alive>
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100vh;
}

.layout__aside {
  background: var(--sidebar-bg);
  transition: width 0.22s ease;
  overflow: hidden;
}

.layout__body {
  min-width: 0;
}

.layout__header {
  height: 56px;
  padding: 0;
  background: var(--header-bg);
  border-bottom: 1px solid var(--el-border-color-light);
}

.layout__main {
  padding: 16px;
  background: var(--el-bg-color-page);
  overflow-y: auto;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .layout__main {
    padding: 12px;
  }
}
</style>
