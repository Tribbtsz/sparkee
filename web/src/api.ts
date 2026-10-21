import type { Note, Stats, TagStat, Todo, TodoFolder } from './types'

/**
 * 后端 API 封装。
 *
 * 地址策略：
 *   1. localStorage 里用户在「服务器配置」填的地址（可选，用于连到别的实例）；
 *   2. 默认保持「同源」——相对路径 `/api/...`。开发时由 Vite 把 /api 代理到 8787
 *      （cf dev），生产时由 Workers Assets 托管，两边都天然同源、无 CORS。
 *
 * 鉴权：localStorage 里的 token 非空才带 `Authorization: Bearer <token>`。
 * 口令不写死在代码里，由用户在 App 内手填。
 */

/** localStorage 的键名：这两个字符串不要改，改了等于让所有人重新配置一次。 */
const KEY_URL = 'sparkee_server_url'
const KEY_TOKEN = 'sparkee_server_token'

/** 请求超时：20 秒。没有超时的话，半死连接会让界面一直转圈。 */
const TIMEOUT_MS = 20_000

function readStorage(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return '' // 隐私模式 / 禁用存储
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* 存不了就算了，本次会话内仍然生效 */
  }
}

/** 没写协议时猜一个：本机/局域网用 http，其余默认 https。 */
function withScheme(raw: string): string {
  if (raw.startsWith('//')) return `https:${raw}`
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)) return raw

  const hostPort = raw.split('/')[0]
  const bracketed = /^\[([^\]]+)\]/.exec(hostPort)
  const host = bracketed ? bracketed[1] : hostPort.split(':')[0]
  const local =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  return `${local ? 'http' : 'https'}://${raw}`
}

/** 去掉尾部斜杠；与当前页面同源时归一到 ''，走相对路径。 */
function normalizeBase(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(withScheme(trimmed))
    const path = u.pathname.replace(/\/+$/, '')
    if (u.origin === location.origin) return path === '' ? '' : path
    return u.origin + path
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

/** 设置弹窗保存前校验地址；返回 null 表示合法，否则返回给用户看的错误。 */
export function validateBaseUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null // 留空 = 同源
  try {
    const u = new URL(withScheme(trimmed))
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return '只支持 http / https 地址'
    }
    return null
  } catch {
    return '地址格式不正确，例如 https://sparkee.example.com'
  }
}

/** 没配过地址时的兜底：同源相对路径。 */
function defaultBaseUrl(): string {
  return ''
}

export function getBaseUrl(): string {
  return normalizeBase(readStorage(KEY_URL)) || defaultBaseUrl()
}

export function setBaseUrl(raw: string): void {
  writeStorage(KEY_URL, normalizeBase(raw))
}

/** 配置弹窗里回显用：没配过就显示当前站点地址。 */
export function displayBaseUrl(): string {
  return getBaseUrl() || location.origin
}

export function getToken(): string {
  return readStorage(KEY_TOKEN).trim()
}

export function setToken(raw: string): void {
  writeStorage(KEY_TOKEN, raw.trim())
}

/** 出错提示里用来指路：当前实际打到哪个地址。 */
function baseLabel(): string {
  return getBaseUrl() || location.origin
}

interface Fail extends Error {
  status?: number
}

function fail(message: string, status?: number): never {
  const err = new Error(message) as Fail
  if (status !== undefined) err.status = status
  throw err
}

async function request<T>(path: string, init: RequestInit, action: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) headers.set('Content-Type', 'application/json; charset=utf-8')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(getBaseUrl() + path, {
      ...init,
      headers,
      signal: ctrl.signal,
      cache: 'no-store',
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      fail(`${action}超时：服务器 ${baseLabel()} 20 秒未响应`)
    }
    fail(`${action}失败：无法连接服务器 ${baseLabel()}`)
  } finally {
    window.clearTimeout(timer)
  }

  if (res.status === 401) fail('未授权：请在服务器配置里填访问密码', 401)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    fail(`${action}失败 ${res.status}：${body.trim() || '服务端未返回详情'}`, res.status)
  }
  if (res.status === 204) return undefined as T
  try {
    return (await res.json()) as T
  } catch {
    fail(`${action}失败：响应不是合法 JSON`)
  }
}

/**
 * 设置弹窗里的「测试连接」：用当前输入框里的地址和口令打一次 /api/stats。
 * 不读写 localStorage，避免用户点取消也把配置改掉。
 */
export async function testConnection(rawBase: string, rawToken: string): Promise<void> {
  const base = normalizeBase(rawBase)
  const label = base || location.origin
  const headers = new Headers({ Accept: 'application/json' })
  const token = rawToken.trim()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${base}/api/stats`, {
      headers,
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (res.status === 401) fail('密码不正确（401）', 401)
    if (!res.ok) fail(`服务器返回 ${res.status}`, res.status)
    await res.json()
  } catch (e) {
    if (e instanceof Error && (e as Fail).status !== undefined) throw e
    if (e instanceof DOMException && e.name === 'AbortError') {
      fail(`连接超时：${label} 20 秒未响应`)
    }
    fail(`无法连接 ${label}`)
  } finally {
    window.clearTimeout(timer)
  }
}

export interface NoteQuery {
  archived?: boolean
  tag?: string | null
  query?: string
  date?: string | null
  /** 客户端时区偏移（分钟，东为正）；只在 date 有值时使用。 */
  tz?: number
}

export function fetchNotes(params: NoteQuery): Promise<Note[]> {
  const q = new URLSearchParams()
  q.set('archived', params.archived ? 'true' : 'false')
  if (params.tag) q.set('tag', params.tag)
  if (params.query) q.set('q', params.query)
  if (params.date) {
    q.set('date', params.date)
    // 后端按 UTC 存时间，日期筛选必须带上浏览器自己的时区偏移，
    // 否则服务器在 UTC、用户在 UTC+8 时凌晨的笔记会漏掉。
    q.set('tz', String(params.tz ?? -new Date().getTimezoneOffset()))
  }
  return request<Note[]>(`/api/notes?${q.toString()}`, { method: 'GET' }, '加载闪念')
}

export function fetchTags(): Promise<TagStat[]> {
  return request<TagStat[]>('/api/tags', { method: 'GET' }, '加载标签')
}

export function fetchStats(): Promise<Stats> {
  return request<Stats>('/api/stats', { method: 'GET' }, '加载统计')
}

export function createNote(content: string): Promise<Note> {
  return request<Note>(
    '/api/notes',
    { method: 'POST', body: JSON.stringify({ content }) },
    '创建闪念',
  )
}

/** PUT 是局部更新：只发要改的字段，其余字段服务端原样保留。 */
export interface NotePatch {
  content?: string
  is_pinned?: boolean
  archived?: boolean
}

export function updateNote(id: number, patch: NotePatch): Promise<Note> {
  return request<Note>(
    `/api/notes/${id}`,
    { method: 'PUT', body: JSON.stringify(patch) },
    '更新闪念',
  )
}

export function deleteNote(id: number): Promise<unknown> {
  return request<unknown>(`/api/notes/${id}`, { method: 'DELETE' }, '删除闪念')
}

// ---------------------------------------------------------------- 待办本

export type TodoSort = 'created' | 'updated'
export type TodoOrder = 'asc' | 'desc'

export interface TodoQuery {
  /** 数字 = 某文件夹；'none' = 未分类；不传 = 全部。 */
  folder?: number | 'none' | null
  sort?: TodoSort
  order?: TodoOrder
}

export function fetchTodos(params: TodoQuery = {}): Promise<Todo[]> {
  const q = new URLSearchParams()
  if (params.folder === 'none') q.set('folder', 'none')
  else if (typeof params.folder === 'number') q.set('folder', String(params.folder))
  if (params.sort) q.set('sort', params.sort)
  if (params.order) q.set('order', params.order)
  const qs = q.toString()
  return request<Todo[]>(`/api/todos${qs ? `?${qs}` : ''}`, { method: 'GET' }, '加载待办')
}

export function fetchTodoFolders(): Promise<TodoFolder[]> {
  return request<TodoFolder[]>('/api/todo-folders', { method: 'GET' }, '加载待办文件夹')
}

export function createTodoFolder(name: string): Promise<TodoFolder> {
  return request<TodoFolder>(
    '/api/todo-folders',
    { method: 'POST', body: JSON.stringify({ name }) },
    '创建文件夹',
  )
}

export function renameTodoFolder(id: number, name: string): Promise<TodoFolder> {
  return request<TodoFolder>(
    `/api/todo-folders/${id}`,
    { method: 'PUT', body: JSON.stringify({ name }) },
    '重命名文件夹',
  )
}

/** 删除文件夹会连同它名下的待办一起删除。 */
export function deleteTodoFolder(id: number): Promise<unknown> {
  return request<unknown>(`/api/todo-folders/${id}`, { method: 'DELETE' }, '删除文件夹')
}

export function createTodo(content: string, folderId: number | null): Promise<Todo> {
  return request<Todo>(
    '/api/todos',
    { method: 'POST', body: JSON.stringify({ content, folder_id: folderId }) },
    '创建待办',
  )
}

/** PUT 是局部更新：只发要改的字段。 */
export interface TodoPatch {
  content?: string
  is_done?: boolean
}

export function updateTodo(id: number, patch: TodoPatch): Promise<Todo> {
  return request<Todo>(
    `/api/todos/${id}`,
    { method: 'PUT', body: JSON.stringify(patch) },
    '更新待办',
  )
}

export function deleteTodo(id: number): Promise<unknown> {
  return request<unknown>(`/api/todos/${id}`, { method: 'DELETE' }, '删除待办')
}
