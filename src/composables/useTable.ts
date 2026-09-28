import { reactive, ref, type Ref } from 'vue'
import type { PageResult } from '@/types'

export interface TableQuery {
  page: number
  pageSize: number
}

/**
 * 列表页的通用逻辑：查询、分页、排序、loading、删除后回退页码。
 *
 * 抽出来的动机很实际：项目里每个列表页都要写一遍这几件事，
 * 抄来抄去的结果就是某个页面忘了「重置时回到第一页」这种细节。
 */
export function useTable<T, Q extends TableQuery>(
  fetcher: (query: Q) => Promise<PageResult<T>>,
  defaultQuery: Q,
  options: { immediate?: boolean } = {},
) {
  const list = ref([]) as Ref<T[]>
  const total = ref(0)
  const loading = ref(false)
  const query = reactive({ ...defaultQuery }) as Q

  async function load(): Promise<void> {
    loading.value = true
    try {
      const result = await fetcher(query)
      list.value = result.list
      total.value = result.total
    } catch {
      // 错误提示由 axios 拦截器统一处理，这里只负责把列表清空
      list.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  /** 改了筛选条件必须回到第一页，否则会停在一个超出范围的页码上，看到空列表却以为是没数据 */
  async function search(): Promise<void> {
    query.page = 1
    await load()
  }

  async function reset(): Promise<void> {
    Object.assign(query, defaultQuery)
    await load()
  }

  async function changePage(page: number): Promise<void> {
    query.page = page
    await load()
  }

  async function changePageSize(pageSize: number): Promise<void> {
    query.pageSize = pageSize
    query.page = 1
    await load()
  }

  /** 排序变化：从第一页重新看比较符合直觉 */
  async function changeSort(prop: string, order: 'asc' | 'desc' | null): Promise<void> {
    if (prop && order) {
      Object.assign(query, { sortBy: prop, sortOrder: order })
    } else {
      Object.assign(query, { sortBy: '', sortOrder: 'desc' })
    }
    query.page = 1
    await load()
  }

  /** 删除之后调用：如果当前页被删空了，自动退到上一页，不然会看到一张空表 */
  async function reloadAfterMutation(): Promise<void> {
    const lastPage = Math.max(1, Math.ceil((total.value - 1) / query.pageSize))
    if (query.page > lastPage) query.page = lastPage
    await load()
  }

  if (options.immediate !== false) void load()

  return {
    list,
    total,
    loading,
    query,
    load,
    search,
    reset,
    changePage,
    changePageSize,
    changeSort,
    reloadAfterMutation,
  }
}
