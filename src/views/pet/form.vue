<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { clinicApi, petApi } from '@/api'
import {
  BREED_OPTIONS,
  GENDER_LABEL,
  SPECIES_LABEL,
  SPECIES_OPTIONS,
  STATUS_OPTIONS,
} from '@/constants'
import { useUserStore } from '@/stores/user'
import type { Clinic, Pet, PetSpecies, PetStatus, VaccineRecord } from '@/types'

interface FormModel {
  name: string
  species: PetSpecies
  breed: string
  gender: 'male' | 'female'
  age: number
  weight: number
  status: PetStatus
  clinicId: number
  ownerName: string
  ownerPhone: string
  lastVisit: string
  nextVaccine: string
  note: string
  vaccines: VaccineRecord[]
}

function emptyForm(): FormModel {
  return {
    name: '',
    species: 'dog',
    breed: '',
    gender: 'male',
    age: 1,
    weight: 5,
    status: 'healthy',
    clinicId: 1,
    ownerName: '',
    ownerPhone: '',
    lastVisit: '',
    nextVaccine: '',
    note: '',
    vaccines: [],
  }
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

/** 新增和编辑共用这个组件，靠路由上是 create 还是 :id/edit 判断模式 */
const petId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' && id ? Number(id) : null
})
const isEdit = computed(() => petId.value !== null)

const formRef = ref<FormInstance>()
const loading = ref(false)
const submitting = ref(false)

const form = reactive<FormModel>(emptyForm())
const clinics = ref<Clinic[]>([])

/** 用快照对比来判断有没有未保存的改动 */
const snapshot = ref('')
const isDirty = computed(() => JSON.stringify(form) !== snapshot.value)

const breedOptions = computed(() => BREED_OPTIONS[form.species] ?? [])

/** 非管理员不能改所属门店，锁定到自己门店 */
const clinicLocked = computed(() => userStore.role !== 'admin' && userStore.userInfo?.clinicId != null)

/* ------------------------------------------------------------------ */
/* 校验规则                                                            */
/* ------------------------------------------------------------------ */

function validatePhone(_rule: unknown, value: string, callback: (error?: Error) => void): void {
  if (!value) return callback(new Error('请输入联系电话'))
  if (!/^1[3-9]\d{9}$/.test(value)) return callback(new Error('手机号格式不正确'))
  callback()
}

/** 跨字段校验：下次接种不能早于最近就诊 */
function validateNextVaccine(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  if (value && form.lastVisit && value < form.lastVisit) {
    return callback(new Error('下次接种日期不能早于最近就诊日期'))
  }
  callback()
}

/** 跨字段校验：最近就诊不能晚于今天 */
function validateLastVisit(
  _rule: unknown,
  value: string,
  callback: (error?: Error) => void,
): void {
  const today = new Date().toISOString().slice(0, 10)
  if (value && value > today) {
    return callback(new Error('就诊日期不能晚于今天'))
  }
  callback()
}

const rules: FormRules = {
  name: [
    { required: true, message: '请输入宠物名称', trigger: 'blur' },
    { min: 1, max: 20, message: '名称长度在 1 到 20 个字符之间', trigger: 'blur' },
  ],
  species: [{ required: true, message: '请选择物种', trigger: 'change' }],
  breed: [{ required: true, message: '请选择品种', trigger: 'change' }],
  age: [
    { required: true, message: '请输入年龄', trigger: 'blur' },
    { type: 'number', min: 0, max: 30, message: '年龄需在 0 到 30 岁之间', trigger: 'blur' },
  ],
  weight: [
    { required: true, message: '请输入体重', trigger: 'blur' },
    { type: 'number', min: 0.1, max: 120, message: '体重需在 0.1 到 120 kg 之间', trigger: 'blur' },
  ],
  clinicId: [{ required: true, message: '请选择所属门店', trigger: 'change' }],
  ownerName: [
    { required: true, message: '请输入主人姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符之间', trigger: 'blur' },
  ],
  ownerPhone: [{ required: true, validator: validatePhone, trigger: 'blur' }],
  lastVisit: [{ validator: validateLastVisit, trigger: 'change' }],
  nextVaccine: [{ validator: validateNextVaccine, trigger: 'change' }],
  note: [{ max: 200, message: '备注不超过 200 个字', trigger: 'blur' }],
}

/* ------------------------------------------------------------------ */
/* 字段联动                                                            */
/* ------------------------------------------------------------------ */

/**
 * 物种一变，原来的品种就不存在了（猫的品种里没有「柯基」），
 * 所以要把已选值清掉，否则会提交一个不匹配的组合。
 * 这类联动是最容易漏的地方 —— 不改的话用户能看到「猫 + 哈士奇」这种脏数据。
 */
function handleSpeciesChange(): void {
  form.breed = ''
  formRef.value?.clearValidate('breed')
}

/** 就诊日期改了，下次接种的校验结果可能就变了，要重新验一次 */
function handleLastVisitChange(): void {
  if (form.nextVaccine) {
    void formRef.value?.validateField('nextVaccine').catch(() => undefined)
  }
}

function addVaccine(): void {
  form.vaccines.push({ name: '', date: '' })
}

function removeVaccine(index: number): void {
  form.vaccines.splice(index, 1)
}

/* ------------------------------------------------------------------ */
/* 数据加载与提交                                                      */
/* ------------------------------------------------------------------ */

function fillForm(pet: Pet): void {
  Object.assign(form, {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    gender: pet.gender,
    age: pet.age,
    weight: pet.weight,
    status: pet.status,
    clinicId: pet.clinicId,
    ownerName: pet.ownerName,
    ownerPhone: pet.ownerPhone,
    lastVisit: pet.lastVisit,
    nextVaccine: pet.nextVaccine,
    note: pet.note,
    vaccines: pet.vaccines.map((item) => ({ ...item })),
  })
}

onMounted(async () => {
  loading.value = true
  try {
    if (userStore.role === 'admin') {
      clinics.value = await clinicApi.list()
    }

    if (isEdit.value && petId.value !== null) {
      const pet = await petApi.detail(petId.value)
      fillForm(pet)
    } else {
      // 非管理员新增时，门店直接定死在自己门店
      const ownClinic = userStore.userInfo?.clinicId
      if (ownClinic != null) form.clinicId = ownClinic
    }

    // 数据填完再拍快照，否则会立刻被判成「有未保存修改」
    snapshot.value = JSON.stringify(form)
  } catch {
    // 档案不存在之类的错误已经由拦截器提示过了，退回列表
    await router.replace('/pet/list')
  } finally {
    loading.value = false
  }
})

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先修正表单中标红的内容')
    return
  }

  submitting.value = true
  try {
    if (isEdit.value && petId.value !== null) {
      await petApi.update(petId.value, { ...form })
      ElMessage.success('保存成功')
    } else {
      await petApi.create({ ...form })
      ElMessage.success('新增成功')
    }

    // 提交成功后要更新快照，否则离开时还会弹「未保存」提示
    snapshot.value = JSON.stringify(form)
    await router.push('/pet/list')
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  void router.back()
}

/** 有未保存改动时拦一下，避免辛苦填的内容被一个误点丢掉 */
onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true
  try {
    await ElMessageBox.confirm('有未保存的修改，确定要离开吗？', '提示', {
      type: 'warning',
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑',
    })
    return true
  } catch {
    return false
  }
})
</script>

<template>
  <div class="page" v-loading="loading">
    <el-card shadow="never" class="page__card">
      <template #header>
        <div class="form__header">
          <span class="form__title">{{ isEdit ? '编辑档案' : '新增档案' }}</span>
          <el-tag v-if="isDirty" type="warning" size="small" effect="light">有未保存的修改</el-tag>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="96px"
        label-position="right"
        class="form"
      >
        <!-- ---------- 基本信息 ---------- -->
        <el-divider content-position="left">基本信息</el-divider>

        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <el-form-item label="宠物名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入宠物名称" clearable />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="物种" prop="species">
              <el-radio-group v-model="form.species" @change="handleSpeciesChange">
                <el-radio-button
                  v-for="item in SPECIES_OPTIONS"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="品种" prop="breed">
              <!-- 可选项跟着物种变，这就是字段联动 -->
              <el-select
                v-model="form.breed"
                :placeholder="`请选择${SPECIES_LABEL[form.species]}的品种`"
                filterable
                clearable
                style="width: 100%"
              >
                <el-option v-for="breed in breedOptions" :key="breed" :label="breed" :value="breed" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio value="male">{{ GENDER_LABEL.male }}</el-radio>
                <el-radio value="female">{{ GENDER_LABEL.female }}</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>

          <el-col :xs="12" :md="6">
            <el-form-item label="年龄" prop="age">
              <el-input-number v-model="form.age" :min="0" :max="30" :step="1" style="width: 100%" />
            </el-form-item>
          </el-col>

          <el-col :xs="12" :md="6">
            <el-form-item label="体重" prop="weight">
              <el-input-number
                v-model="form.weight"
                :min="0.1"
                :max="120"
                :step="0.1"
                :precision="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="当前状态" prop="status">
              <el-select v-model="form.status" style="width: 100%">
                <el-option
                  v-for="item in STATUS_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="所属门店" prop="clinicId">
              <el-select
                v-model="form.clinicId"
                :disabled="clinicLocked"
                placeholder="请选择门店"
                style="width: 100%"
              >
                <el-option
                  v-for="item in clinics"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <div v-if="clinicLocked" class="form__tip">已锁定为你的所属门店</div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ---------- 主人信息 ---------- -->
        <el-divider content-position="left">主人信息</el-divider>

        <el-row :gutter="20">
          <el-col :xs="24" :md="12">
            <el-form-item label="主人姓名" prop="ownerName">
              <el-input v-model="form.ownerName" placeholder="请输入主人姓名" clearable />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="联系电话" prop="ownerPhone">
              <el-input
                v-model="form.ownerPhone"
                placeholder="请输入 11 位手机号"
                maxlength="11"
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="最近就诊" prop="lastVisit">
              <el-date-picker
                v-model="form.lastVisit"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width: 100%"
                @change="handleLastVisitChange"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24" :md="12">
            <el-form-item label="下次接种" prop="nextVaccine">
              <el-date-picker
                v-model="form.nextVaccine"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="备注" prop="note">
              <el-input
                v-model="form.note"
                type="textarea"
                :rows="3"
                maxlength="200"
                show-word-limit
                placeholder="过敏史、性格、特殊注意事项等"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- ---------- 疫苗记录（动态增减） ---------- -->
        <el-divider content-position="left">
          疫苗记录
          <el-button
            v-permission="'pet:vaccine:edit'"
            link
            type="primary"
            class="form__add-vaccine"
            @click="addVaccine"
          >
            <AppIcon name="Plus" />添加一条
          </el-button>
        </el-divider>

        <el-empty v-if="form.vaccines.length === 0" description="还没有疫苗记录" :image-size="70" />

        <div v-for="(item, index) in form.vaccines" :key="index" class="vaccine">
          <el-form-item
            label="疫苗名称"
            :prop="`vaccines.${index}.name`"
            :rules="{ required: true, message: '请填写疫苗名称', trigger: 'blur' }"
          >
            <el-input v-model="item.name" placeholder="例如：狂犬疫苗" clearable />
          </el-form-item>

          <el-form-item
            label="接种日期"
            :prop="`vaccines.${index}.date`"
            :rules="{ required: true, message: '请选择接种日期', trigger: 'change' }"
          >
            <el-date-picker
              v-model="item.date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              style="width: 100%"
            />
          </el-form-item>

          <el-button
            v-permission="'pet:vaccine:edit'"
            type="danger"
            plain
            class="vaccine__remove"
            @click="removeVaccine(index)"
          >
            <AppIcon name="Delete" />
          </el-button>
        </div>

        <!-- ---------- 操作 ---------- -->
        <div class="form__actions">
          <el-button size="large" @click="handleCancel">取消</el-button>
          <el-button type="primary" size="large" :loading="submitting" @click="submit">
            {{ isEdit ? '保存修改' : '确认新增' }}
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.form__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form__title {
  font-size: 15px;
  font-weight: 600;
}

.form__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.form__add-vaccine {
  margin-left: 8px;
}

.vaccine {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px 0;
  margin-bottom: 8px;
  border: 1px dashed var(--el-border-color-lighter);
  border-radius: var(--app-radius);
  background: var(--el-fill-color-blank);
}

.vaccine :deep(.el-form-item) {
  flex: 1;
  margin-bottom: 12px;
}

.vaccine__remove {
  margin-top: 2px;
}

.form__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 768px) {
  .vaccine {
    flex-direction: column;
    gap: 0;
    padding-bottom: 12px;
  }

  .vaccine :deep(.el-form-item__label) {
    width: 74px;
  }
}
</style>
