<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ROLE_TAG_TYPE } from '@/constants'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const formRef = ref<FormInstance>()
const saving = ref(false)

/** 演示用：真实项目里这里会调一个更新用户资料的接口 */
const form = reactive({
  nickname: userStore.nickname,
  email: '',
  bio: '',
})

function validateEmail(_rule: unknown, value: string, callback: (error?: Error) => void): void {
  if (!value) return callback()
  if (!/^[\w.-]+@[\w-]+\.[\w.]+$/.test(value)) return callback(new Error('邮箱格式不正确'))
  callback()
}

const rules: FormRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 2, max: 12, message: '昵称长度 2 到 12 个字符', trigger: 'blur' },
  ],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  bio: [{ max: 60, message: '简介不超过 60 个字', trigger: 'blur' }],
}

async function save(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    // 没有对应的后端接口，这里只是让保存按钮有真实反馈
    await new Promise((resolve) => setTimeout(resolve, 400))
    ElMessage.success('资料已保存')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <el-row :gutter="16">
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="page__card profile__card">
          <el-avatar :size="72" class="profile__avatar">
            {{ userStore.nickname.slice(0, 1) }}
          </el-avatar>

          <div class="profile__name">{{ userStore.nickname }}</div>

          <el-tag :type="ROLE_TAG_TYPE[userStore.role]" size="small" effect="light">
            {{ userStore.roleName }}
          </el-tag>

          <el-descriptions :column="1" border class="profile__desc">
            <el-descriptions-item label="账号">
              {{ userStore.userInfo?.username }}
            </el-descriptions-item>
            <el-descriptions-item label="数据范围">
              {{ userStore.clinicName }}
            </el-descriptions-item>
            <el-descriptions-item label="权限码数量">
              {{ userStore.permissions.length }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="16">
        <el-card shadow="never" class="page__card">
          <template #header><span class="profile__title">基本资料</span></template>

          <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" placeholder="请输入昵称" clearable />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="选填，用于接收通知" clearable />
            </el-form-item>

            <el-form-item label="简介" prop="bio">
              <el-input
                v-model="form.bio"
                type="textarea"
                :rows="3"
                maxlength="60"
                show-word-limit
                placeholder="选填"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="save">保存</el-button>
              <el-button @click="formRef?.resetFields()">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.profile__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.profile__avatar {
  background: var(--el-color-primary);
  color: #fff;
  font-size: 28px;
}

.profile__name {
  font-size: 17px;
  font-weight: 600;
}

.profile__desc {
  width: 100%;
  margin-top: 8px;
  text-align: left;
}

.profile__title {
  font-size: 15px;
  font-weight: 600;
}
</style>
