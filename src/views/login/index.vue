<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { useAuthActions } from '@/composables/useAuthActions'
import { DEMO_ACCOUNTS, ROLE_LABEL } from '@/constants'
import type { Role } from '@/types'

const router = useRouter()
const route = useRoute()
const { loginAs } = useAuthActions()

const formRef = ref<FormInstance>()
const loading = ref(false)

/** 预填演示账号：招聘方点开链接应该能直接进，而不是卡在登录页 */
const form = reactive({ username: 'admin', password: '123456' })

const rules: FormRules<typeof form> = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { min: 3, max: 20, message: '账号长度为 3 到 20 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

const HIGHLIGHTS = [
  { icon: 'Lock', text: '权限体系：路由级 + 按钮级，四种角色实时切换' },
  { icon: 'DataLine', text: '数据看板：ECharts 折线图 / 柱状图 / 环形图' },
  { icon: 'List', text: '列表页：多条件查询、排序、分页、批量操作' },
  { icon: 'Edit', text: '表单页：复杂校验、字段联动、动态增减项' },
]

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await loginAs(form.username, form.password)
    ElMessage.success('登录成功')

    const redirect = route.query.redirect
    await router.replace(typeof redirect === 'string' ? redirect : '/dashboard')
  } catch {
    // 错误提示由响应拦截器统一弹出，这里不重复处理
  } finally {
    loading.value = false
  }
}

async function quickLogin(role: Role): Promise<void> {
  const account = DEMO_ACCOUNTS.find((item) => item.role === role)
  if (!account) return
  form.username = account.username
  form.password = account.password
  await submit()
}
</script>

<template>
  <div class="login">
    <!-- 左侧介绍区：让点进来的人立刻知道这个 demo 演示了什么 -->
    <aside class="login__intro">
      <div class="login__brand">
        <img src="/favicon.svg" alt="logo" />
        <h1>宠物诊所管理后台</h1>
      </div>
      <p class="login__subtitle">Vue 3 · TypeScript · Vite · Element Plus · Pinia · ECharts</p>

      <ul class="login__list">
        <li v-for="item in HIGHLIGHTS" :key="item.text">
          <AppIcon :name="item.icon" />
          <span>{{ item.text }}</span>
        </li>
      </ul>
    </aside>

    <!-- 右侧表单区 -->
    <main class="login__panel">
      <div class="login__box">
        <h2 class="login__title">欢迎回来</h2>
        <p class="login__hint">账号已预填，直接点「登录」即可</p>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          size="large"
          label-position="top"
          @keyup.enter="submit"
        >
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" placeholder="请输入账号" clearable>
              <template #prefix>
                <AppIcon name="User" />
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
            >
              <template #prefix>
                <AppIcon name="Lock" />
              </template>
            </el-input>
          </el-form-item>

          <el-button
            type="primary"
            size="large"
            class="login__submit"
            :loading="loading"
            @click="submit"
          >
            登 录
          </el-button>
        </el-form>

        <el-divider>
          <span class="login__divider">或直接用不同角色体验</span>
        </el-divider>

        <div class="login__quick">
          <el-button
            v-for="account in DEMO_ACCOUNTS"
            :key="account.role"
            :disabled="loading"
            class="login__quick-btn"
            @click="quickLogin(account.role)"
          >
            <span class="login__quick-name">{{ ROLE_LABEL[account.role] }}</span>
            <span class="login__quick-desc">{{ account.desc }}</span>
          </el-button>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  min-height: 100vh;
}

/* ---------- 左侧 ---------- */

.login__intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 20px;
  padding: 56px;
  color: #fff;
  background: linear-gradient(150deg, #1f2d3d 0%, #2b4a6f 55%, #3a6ea5 100%);
}

.login__brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.login__brand img {
  width: 44px;
  height: 44px;
}

.login__brand h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 1px;
}

.login__subtitle {
  margin: 0;
  font-size: 13px;
  color: rgb(255 255 255 / 60%);
  letter-spacing: 0.5px;
}

.login__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.login__list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: rgb(255 255 255 / 85%);
}

/* ---------- 右侧 ---------- */

.login__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--el-bg-color);
}

.login__box {
  width: 100%;
  max-width: 380px;
}

.login__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.login__hint {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.login__submit {
  width: 100%;
  margin-top: 4px;
  letter-spacing: 4px;
}

.login__divider {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.login__quick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.login__quick-btn {
  height: auto;
  margin: 0;
  padding: 10px 12px;
}

/*
 * el-button 会把插槽内容再包一层 <span>，所以按钮上的 flex-direction: column 到不了这两个元素。
 * 直接把它们变成块级元素更省事：块级元素自然换行，也不用去猜 Element Plus 的内部结构。
 */
.login__quick-btn :deep(.login__quick-name),
.login__quick-btn :deep(.login__quick-desc) {
  display: block;
  text-align: left;
}

.login__quick-name {
  font-size: 13px;
  font-weight: 600;
}

.login__quick-desc {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: normal;
  line-height: 1.4;
}

/* ---------- 小屏：收成单列 ---------- */

@media (max-width: 900px) {
  .login {
    grid-template-columns: 1fr;
  }

  .login__intro {
    padding: 32px 24px;
  }

  .login__brand h1 {
    font-size: 20px;
  }

  .login__list {
    display: none;
  }
}
</style>
