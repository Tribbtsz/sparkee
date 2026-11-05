/**
 * D1 数据访问层。
 *
 * D1 表结构与查询都在这一层；路由层只负责解析参数和拼 JSON。
 */

import { escapeLike, extractTags, nowIso } from './util'

export interface Note {
  id: number
  content: string
  tags: string[]
  is_pinned: boolean
  archived: boolean
  created_at: string
  updated_at: string
}

export interface TagStat {
  name: string
  count: number
}

export interface Stats {
  active: number
  archived: number
  total: number
  todos_open: number
}

export interface TodoFolder {
  id: number
  name: string
  open_count: number
  created_at: string
  updated_at: string
}

export interface Todo {
  id: number
  folder_id: number | null
  content: string
  is_done: boolean
  created_at: string
  updated_at: string
}

export class NotFoundError extends Error {}
export class BadRequestError extends Error {}

interface NoteRow {
  id: number
  content: string
  tags: string
  is_pinned: number
  archived: number
  created_at: string
  updated_at: string
}

interface TodoRow {
  id: number
  folder_id: number | null
  content: string
  is_done: number
  created_at: string
  updated_at: string
}

interface FolderRow {
  id: number
  name: string
  open_count: number
  created_at: string
  updated_at: string
}

const NOTE_COLUMNS = 'id, content, tags, is_pinned, archived, created_at, updated_at'

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    content: row.content,
    tags: row.tags ? row.tags.split(',') : [],
    is_pinned: row.is_pinned === 1,
    archived: row.archived === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    folder_id: row.folder_id,
    content: row.content,
    is_done: row.is_done === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// ---------------------------------------------------------------- notes

export async function listNotes(
  db: D1Database,
  opts: {
    archived: boolean
    tag: string
    query: string
    dateStart: number | null
    dateEnd: number | null
  },
): Promise<Note[]> {
  let sql = `SELECT ${NOTE_COLUMNS} FROM notes WHERE archived = ?`
  const args: Array<string | number | null> = [opts.archived ? 1 : 0]

  if (opts.dateStart !== null && opts.dateEnd !== null) {
    sql += ' AND created_at >= ? AND created_at < ?'
    args.push(new Date(opts.dateStart).toISOString(), new Date(opts.dateEnd).toISOString())
  }

  if (opts.tag) {
    // 用逗号包裹首尾，一条语句同时覆盖「首/中/尾/唯一」四种情况。
    // instr 比 LIKE 更直接：标签里允许 _ 和 -，不会有通配符歧义。
    sql += " AND instr(',' || tags || ',', ',' || ? || ',') > 0"
    args.push(opts.tag.toLowerCase())
  }

  if (opts.query) {
    sql += " AND content LIKE ? ESCAPE '\\'"
    args.push(`%${escapeLike(opts.query)}%`)
  }

  sql += ' ORDER BY is_pinned DESC, updated_at DESC, id DESC'

  const { results } = await db
    .prepare(sql)
    .bind(...args)
    .all<NoteRow>()
  return results.map(toNote)
}

export async function stats(db: D1Database): Promise<Stats> {
  const row = await db
    .prepare(
      `SELECT
         (SELECT count(*) FROM notes WHERE archived = 0) AS active,
         (SELECT count(*) FROM notes WHERE archived = 1) AS archived,
         (SELECT count(*) FROM todos WHERE is_done = 0) AS todos_open`,
    )
    .first<{ active: number; archived: number; todos_open: number }>()

  const active = row?.active ?? 0
  const archived = row?.archived ?? 0
  return {
    active,
    archived,
    total: active + archived,
    todos_open: row?.todos_open ?? 0,
  }
}

export async function createNote(db: D1Database, content: string): Promise<Note> {
  const now = nowIso()
  const tags = extractTags(content)
  const res = await db
    .prepare(
      `INSERT INTO notes (content, tags, is_pinned, archived, created_at, updated_at)
       VALUES (?, ?, 0, 0, ?, ?)`,
    )
    .bind(content, tags.join(','), now, now)
    .run()

  return {
    id: Number(res.meta.last_row_id),
    content,
    tags,
    is_pinned: false,
    archived: false,
    created_at: now,
    updated_at: now,
  }
}

export async function updateNote(
  db: D1Database,
  id: number,
  patch: { content?: string; isPinned?: boolean; archived?: boolean },
): Promise<Note> {
  const row = await db
    .prepare(`SELECT ${NOTE_COLUMNS} FROM notes WHERE id = ?`)
    .bind(id)
    .first<NoteRow>()
  if (!row) throw new NotFoundError('note not found')

  const next: NoteRow = { ...row }
  // 只更新请求里点名要改的列：两台设备同时改不同字段时，后到的那次不会把前一次的改动写回旧值。
  const sets: string[] = []
  const args: Array<string | number> = []

  if (patch.content !== undefined && patch.content !== row.content) {
    next.content = patch.content
    next.tags = extractTags(patch.content).join(',')
    sets.push('content = ?', 'tags = ?')
    args.push(next.content, next.tags)
  }
  if (patch.isPinned !== undefined && patch.isPinned !== (row.is_pinned === 1)) {
    next.is_pinned = patch.isPinned ? 1 : 0
    sets.push('is_pinned = ?')
    args.push(next.is_pinned)
  }
  if (patch.archived !== undefined && patch.archived !== (row.archived === 1)) {
    next.archived = patch.archived ? 1 : 0
    sets.push('archived = ?')
    args.push(next.archived)
  }

  // 没有任何字段真的变化：不写库、不动 updated_at ——
  // 否则卡片会因为"最后更新时间"变了而无端跳到列表最前。
  if (sets.length === 0) return toNote(next)

  const now = nowIso()
  sets.push('updated_at = ?')
  args.push(now, id)
  await db
    .prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run()

  next.updated_at = now
  return toNote(next)
}

export async function deleteNote(db: D1Database, id: number): Promise<void> {
  const res = await db.prepare('DELETE FROM notes WHERE id = ?').bind(id).run()
  if (res.meta.changes === 0) throw new NotFoundError('note not found')
}

export async function getTags(db: D1Database): Promise<TagStat[]> {
  const { results } = await db
    .prepare("SELECT tags FROM notes WHERE archived = 0 AND tags != ''")
    .all<{ tags: string }>()

  const counts = new Map<string, number>()
  for (const row of results) {
    for (const raw of row.tags.split(',')) {
      const tag = raw.trim()
      if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (a.count !== b.count ? b.count - a.count : a.name < b.name ? -1 : 1))
}

// ---------------------------------------------------------------- todos

export async function listTodoFolders(db: D1Database): Promise<TodoFolder[]> {
  const { results } = await db
    .prepare(
      `SELECT f.id, f.name, f.created_at, f.updated_at,
              (SELECT count(*) FROM todos t WHERE t.folder_id = f.id AND t.is_done = 0) AS open_count
       FROM todo_folders f
       ORDER BY f.created_at ASC, f.id ASC`,
    )
    .all<FolderRow>()

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    open_count: row.open_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }))
}

export async function createTodoFolder(db: D1Database, name: string): Promise<TodoFolder> {
  const now = nowIso()
  const res = await db
    .prepare('INSERT INTO todo_folders (name, created_at, updated_at) VALUES (?, ?, ?)')
    .bind(name, now, now)
    .run()
  return { id: Number(res.meta.last_row_id), name, open_count: 0, created_at: now, updated_at: now }
}

export async function renameTodoFolder(
  db: D1Database,
  id: number,
  name: string,
): Promise<TodoFolder> {
  const row = await db
    .prepare(
      `SELECT f.id, f.name, f.created_at, f.updated_at,
              (SELECT count(*) FROM todos t WHERE t.folder_id = f.id AND t.is_done = 0) AS open_count
       FROM todo_folders f WHERE f.id = ?`,
    )
    .bind(id)
    .first<FolderRow>()
  if (!row) throw new NotFoundError('folder not found')

  if (row.name === name) {
    return {
      id: row.id,
      name: row.name,
      open_count: row.open_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }

  const now = nowIso()
  await db
    .prepare('UPDATE todo_folders SET name = ?, updated_at = ? WHERE id = ?')
    .bind(name, now, id)
    .run()

  return {
    id: row.id,
    name,
    open_count: row.open_count,
    created_at: row.created_at,
    updated_at: now,
  }
}

/** 删除文件夹并级联删掉它的全部待办（未分类的待办不受影响）。 */
export async function deleteTodoFolder(db: D1Database, id: number): Promise<void> {
  const exists = await db
    .prepare('SELECT id FROM todo_folders WHERE id = ?')
    .bind(id)
    .first<{ id: number }>()
  if (!exists) throw new NotFoundError('folder not found')

  // batch 是一个事务：要么两个删除都成功，要么都不生效。
  await db.batch([
    db.prepare('DELETE FROM todos WHERE folder_id = ?').bind(id),
    db.prepare('DELETE FROM todo_folders WHERE id = ?').bind(id),
  ])
}

/**
 * folder 为空 = 全部；"none" = 未分类；其余为文件夹 id。
 * 排序：已完成的永远沉底，再按创建/修改时间升或降序排。
 */
export async function listTodos(
  db: D1Database,
  folder: string,
  sortKey: string,
  desc: boolean,
): Promise<Todo[]> {
  let where = ''
  const args: Array<string | number | null> = []

  if (folder === 'none') {
    where = ' WHERE folder_id IS NULL'
  } else if (folder !== '') {
    if (!/^\d+$/.test(folder)) throw new BadRequestError('invalid folder')
    where = ' WHERE folder_id = ?'
    args.push(Number(folder))
  }

  const column = sortKey === 'updated' ? 'updated_at' : 'created_at'
  const dir = desc ? 'DESC' : 'ASC'

  const { results } = await db
    .prepare(
      `SELECT id, folder_id, content, is_done, created_at, updated_at FROM todos` +
        `${where} ORDER BY is_done ASC, ${column} ${dir}, id ${dir}`,
    )
    .bind(...args)
    .all<TodoRow>()

  return results.map(toTodo)
}

export async function createTodo(
  db: D1Database,
  folderId: number | null,
  content: string,
): Promise<Todo> {
  const now = nowIso()
  // 校验和插入放在同一条语句里：先 SELECT 再 INSERT 的话，
  // 两步之间文件夹被删掉就会留下孤立待办。
  const res = await db
    .prepare(
      `INSERT INTO todos (folder_id, content, is_done, created_at, updated_at)
       SELECT ?, ?, 0, ?, ?
       WHERE ? IS NULL OR EXISTS (SELECT 1 FROM todo_folders WHERE id = ?)`,
    )
    .bind(folderId, content, now, now, folderId, folderId)
    .run()
  if (res.meta.changes === 0) throw new BadRequestError('invalid folder')

  return {
    id: Number(res.meta.last_row_id),
    folder_id: folderId,
    content,
    is_done: false,
    created_at: now,
    updated_at: now,
  }
}

export async function updateTodo(
  db: D1Database,
  id: number,
  patch: { content?: string; isDone?: boolean },
): Promise<Todo> {
  const row = await db
    .prepare(
      'SELECT id, folder_id, content, is_done, created_at, updated_at FROM todos WHERE id = ?',
    )
    .bind(id)
    .first<TodoRow>()
  if (!row) throw new NotFoundError('todo not found')

  // 与 updateNote 同理：只写请求里出现的列，避免两台设备互相覆盖。
  const sets: string[] = []
  const args: Array<string | number> = []

  if (patch.content !== undefined && patch.content !== row.content) {
    sets.push('content = ?')
    args.push(patch.content)
  }
  if (patch.isDone !== undefined && patch.isDone !== (row.is_done === 1)) {
    sets.push('is_done = ?')
    args.push(patch.isDone ? 1 : 0)
  }

  // 没有实际变化：不写库、不动 updated_at。
  if (sets.length === 0) return toTodo(row)

  const now = nowIso()
  sets.push('updated_at = ?')
  args.push(now, id)
  await db
    .prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run()

  const content = patch.content !== undefined ? patch.content : row.content
  const isDone = patch.isDone !== undefined ? (patch.isDone ? 1 : 0) : row.is_done

  return {
    id: row.id,
    folder_id: row.folder_id,
    content,
    is_done: isDone === 1,
    created_at: row.created_at,
    updated_at: now,
  }
}

export async function deleteTodo(db: D1Database, id: number): Promise<void> {
  const res = await db.prepare('DELETE FROM todos WHERE id = ?').bind(id).run()
  if (res.meta.changes === 0) throw new NotFoundError('todo not found')
}
