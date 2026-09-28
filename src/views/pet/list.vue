<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableInstance } from 'element-plus'
import AppIcon from '@/components/AppIcon.vue'
import { clinicApi, petApi } from '@/api'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useTable, type TableQuery } from '@/composables/useTable'
import {
  GENDER_LABEL,
  SPECIES_LABEL,
  SPECIES_OPTIONS,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_TAG_TYPE,
} from '@/constants'
import { useUserStore } from '@/stores/user'
import type { Clinic, Pet, PetSpecies, PetStatus } from '@/types'

// keep-alive 按组件名匹配，必须显式声明
defineOptions({ name: 'PetList' })

interface ListQuery extends TableQuery {
  keyword: string
  species: PetSpecies | ''
  status: PetStatus | ''
  clinicId: number | ''
  dateRange: [string, string] | null
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const DEFAULT_QUERY: ListQuery = {
  keyword: '',
  species: '',
  status: '',
  clinicId: '',
  dateRange: null,
  sortBy: '',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
}

const router = useRouter()
const userStore = useUserStore()

/** 窄屏换成卡片流：表格在手机上没法看 */
const isNarrow = useMediaQuery('(max-width: 768px)')

const tableRef = ref<TableInstance>()
const clinics = ref<Clinic[]>([])
const selection = ref<Pet[]>([])

/** 列表接口的参数和页面的查询表单不完全一致，在这里做一次转换 */
async function fetchPets(q: ListQuery) {
  return petApi.list({
    keyword: q.keyword,
    species: q.species,
    status: q.status,
    clinicId: q.clinicId,
    startDate: q.dateRange?.[0],
    endDate: q.dateRange?.[1],
    page: q.page,
    pageSize: q.pageSize,
    sortBy: q.sortBy || undefined,
    sortOrder: q.sortBy ? q.sortOrder : undefined,
  })
}

const {
  list,
  total,
  loading,
  query,
  search,
  reset,
  changePage,
  changePageSize,
  changeSort,
  reloadAfterMutation,
} = useTable<Pet, ListQuery>(fetchPets, DEFAULT_QUERY)

const hasSelection = computed(() => selection.value.length > 0)

onMounted(async () => {
  if (userStore.role !== 'admin') return
  try {
    clinics.value = await clinicApi.list()
  } catch {
    // 筛选条件加载失败不该阻塞整个页面
  }
})

function handleSelectionChange(rows: Pet[]): void {
  selection.value = rows
}

/** el-table 的 sort-change 事件：取消排序时 prop 和 order 都会是 null */
interface SortPayload {
  prop: string | null
  order: 'ascending' | 'descending' | null
}

function handleSortChange({ prop, order }: SortPayload): void {
  const mapped = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : null
  void changeSort(prop ?? '', mapped)
}

function goCreate(): void {
  void router.push('/pet/create')
}

function goEdit(pet: Pet): void {
  void router.push(`/pet/${pet.id}/edit`)
}

async function handleDelete(pet: Pet): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除「${pet.name}」的档案吗？该操作不可撤销。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return // 用户取消
  }

  await petApi.remove(pet.id)
  ElMessage.success('删除成功')
  await reloadAfterMutation()
}

async function handleBatchDelete(): Promise<void> {
  if (!hasSelection.value) return

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selection.value.length} 条档案吗？`, '批量删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }

  await petApi.batchRemove(selection.value.map((item) => item.id))
  ElMessage.success(`已删除 ${selection.value.length} 条档案`)
  tableRef.value?.clearSelection()
  selection.value = []
  await reloadAfterMutation()
}

/**
 * 导出 CSV。
 * 前面加 ﻿ 是为了让 Excel 认出这是 UTF-8 ——
 * 省掉这个 BOM，中文在 Excel 里会变成乱码。
 */
function handleExport(): void {
  const headers = ['宠物名称', '物种', '品种', '性别', '年龄', '体重(kg)', '主人', '联系电话', '最近就诊', '状态']
  const rows = list.value.map((pet) => [
    pet.name,
    SPECIES_LABEL[pet.species],
    pet.breed,
    GENDER_LABEL[pet.gender],
    String(pet.age),
    String(pet.weight),
    pet.ownerName,
    pet.ownerPhone,
    pet.lastVisit,
    STATUS_LABEL[pet.status],
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\r\n')

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `宠物档案_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`已导出当前页 ${rows.length} 条记录`)
}
</script>

<template>
  <div class="page">
    <!-- 查询条件 -->
    <el-card shadow="never" class="page__card">
      <el-form :model="query" inline label-width="72px" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="query.keyword"
            placeholder="宠物名 / 主人 / 手机号"
            clearable
            style="width: 200px"
            @keyup.enter="search"
          />
        </el-form-item>

        <el-form-item label="物种">
          <el-select v-model="query.species" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="item in SPECIES_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="item in STATUS_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <!-- 门店筛选只对能看全部数据的角色有意义 -->
        <el-form-item v-if="userStore.role === 'admin'" label="门店">
          <el-select v-model="query.clinicId" placeholder="全部门店" clearable style="width: 170px">
            <el-option
              v-for="item in clinics"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="就诊时间">
          <el-date-picker
            v-model="query.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="search">
            <AppIcon name="Search" />查询
          </el-button>
          <el-button @click="reset">
            <AppIcon name="Refresh" />重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="page__card">
      <div class="page__toolbar">
        <div class="list__summary">
          共 <b class="tabular">{{ total }}</b> 条档案
          <span v-if="hasSelection" class="list__selected">
            已选 <b class="tabular">{{ selection.length }}</b> 条
          </span>
        </div>

        <div class="page__toolbar-right">
          <el-button
            v-permission="'pet:delete'"
            type="danger"
            plain
            :disabled="!hasSelection"
            @click="handleBatchDelete"
          >
            <AppIcon name="Delete" />批量删除
          </el-button>

          <el-button v-permission="'pet:export'" @click="handleExport">
            <AppIcon name="Download" />导出
          </el-button>

          <el-button v-permission="'pet:add'" type="primary" @click="goCreate">
            <AppIcon name="Plus" />新增档案
          </el-button>
        </div>
      </div>

      <!-- 宽屏：表格 -->
      <el-table
        v-if="!isNarrow"
        ref="tableRef"
        v-loading="loading"
        :data="list"
        row-key="id"
        stripe
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
      >
        <el-table-column type="selection" width="46" reserve-selection />

        <el-table-column prop="name" label="宠物名称" min-width="110" fixed>
          <template #default="{ row }">
            <el-link type="primary" :underline="false" @click="goEdit(row as Pet)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column label="物种 / 品种" min-width="150">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ SPECIES_LABEL[(row as Pet).species] }}</el-tag>
            <span class="list__breed">{{ row.breed }}</span>
          </template>
        </el-table-column>

        <el-table-column label="性别" width="70" align="center">
          <template #default="{ row }">{{ GENDER_LABEL[(row as Pet).gender] }}</template>
        </el-table-column>

        <el-table-column prop="age" label="年龄" width="92" sortable="custom" align="right">
          <template #default="{ row }"><span class="tabular">{{ row.age }} 岁</span></template>
        </el-table-column>

        <el-table-column prop="weight" label="体重" width="100" sortable="custom" align="right">
          <template #default="{ row }"><span class="tabular">{{ row.weight }} kg</span></template>
        </el-table-column>

        <el-table-column label="主人" min-width="140">
          <template #default="{ row }">
            <div>{{ row.ownerName }}</div>
            <div class="list__phone tabular">{{ row.ownerPhone }}</div>
          </template>
        </el-table-column>

        <el-table-column prop="lastVisit" label="最近就诊" width="130" sortable="custom">
          <template #default="{ row }"><span class="tabular">{{ row.lastVisit }}</span></template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="STATUS_TAG_TYPE[(row as Pet).status]" size="small" effect="light">
              {{ STATUS_LABEL[(row as Pet).status] }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'pet:edit'" link type="primary" @click="goEdit(row as Pet)">
              编辑
            </el-button>
            <el-button
              v-permission="'pet:delete'"
              link
              type="danger"
              @click="handleDelete(row as Pet)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="没有符合条件的档案">
            <el-button @click="reset">清空筛选条件</el-button>
          </el-empty>
        </template>
      </el-table>

      <!-- 窄屏：卡片流 -->
      <div v-else v-loading="loading" class="list__cards">
        <el-empty v-if="!loading && list.length === 0" description="没有符合条件的档案">
          <el-button @click="reset">清空筛选条件</el-button>
        </el-empty>

        <div v-for="pet in list" :key="pet.id" class="pet-card" @click="goEdit(pet)">
          <div class="pet-card__head">
            <span class="pet-card__name">{{ pet.name }}</span>
            <el-tag :type="STATUS_TAG_TYPE[pet.status]" size="small" effect="light">
              {{ STATUS_LABEL[pet.status] }}
            </el-tag>
          </div>

          <div class="pet-card__meta">
            <span>{{ SPECIES_LABEL[pet.species] }} · {{ pet.breed }}</span>
            <span>{{ GENDER_LABEL[pet.gender] }} · {{ pet.age }} 岁 · {{ pet.weight }}kg</span>
          </div>

          <div class="pet-card__owner">
            <span>{{ pet.ownerName }}</span>
            <span class="tabular">{{ pet.ownerPhone }}</span>
          </div>

          <div class="pet-card__foot">
            <span>最近就诊 {{ pet.lastVisit }}</span>
            <el-button
              v-permission="'pet:delete'"
              link
              type="danger"
              size="small"
              @click.stop="handleDelete(pet)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>

      <div class="page__pagination">
        <el-pagination
          :current-page="query.page"
          :page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          :layout="isNarrow ? 'prev, pager, next' : 'total, sizes, prev, pager, next, jumper'"
          background
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.list__summary {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.list__summary b {
  color: var(--el-color-primary);
}

.list__selected {
  margin-left: 10px;
  color: var(--el-color-warning);
}

.list__breed {
  margin-left: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.list__phone {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* ---------- 窄屏卡片 ---------- */

.list__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 120px;
}

.pet-card {
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--app-radius);
  cursor: pointer;
  transition: border-color 0.18s ease;
}

.pet-card:active {
  border-color: var(--el-color-primary);
}

.pet-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pet-card__name {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.pet-card__meta,
.pet-card__owner {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.pet-card__owner {
  color: var(--el-text-color-secondary);
}

.pet-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed var(--el-border-color-lighter);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
