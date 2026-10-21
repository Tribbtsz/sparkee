/** 与后端 worker/src/store.ts 的 JSON 字段一一对应（字段名保持 snake_case，别改名）。 */

export interface Note {
  id: number
  content: string
  tags: string[]
  is_pinned: boolean
  archived: boolean
  /** RFC3339，带时区偏移；new Date() 会转成本地时间。 */
  created_at: string
  updated_at: string
}

export interface TagStat {
  name: string
  count: number
}

/** GET /api/stats：不受当前筛选影响的整体计数。 */
export interface Stats {
  active: number
  archived: number
  total: number
  /** 未完成待办总数（侧栏「待办本」徽标）。 */
  todos_open: number
}

/** 待办文件夹（一级「项目」，用于隔离）。 */
export interface TodoFolder {
  id: number
  name: string
  /** 未完成待办数。 */
  open_count: number
  created_at: string
  updated_at: string
}

/** 一条待办。folder_id 为 null 表示「未分类」。 */
export interface Todo {
  id: number
  folder_id: number | null
  content: string
  is_done: boolean
  created_at: string
  updated_at: string
}
