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

  const { results } = await db.prepare(sql).bind(...args).all<NoteRow>()
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

  const contentChanged = patch.content !== undefined && patch.content !== row.content
  const pinnedChanged = patch.isPinned !== undefined && patch.isPinned !== (row.is_pinned === 1)
  const archivedChanged = patch.archived !== undefined && patch.archived !== (row.archived === 1)

  const next: NoteRow = { ...row }
  if (contentChanged) {
    next.content = patch.content!
    next.tags = extractTags(patch.content!).join(',')
  }
  if (pinnedChanged) next.is_pinned = patch.isPinned ? 1 : 0
  if (archivedChanged) next.archived = patch.archived ? 1 : 0

  // 没有任何字段真的变化：不写库、不动 updated_at ——
  // 否则卡片会因为"最后更新时间"变了而无端跳到列表最前。
  if (!contentChanged && !pinnedChanged && !archivedChanged) {
    return toNote(next)
  }

  const now = nowIso()
  await db
    .prepare(
      `UPDATE notes
       SET content = ?, tags = ?, is_pinned = ?, archived = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(next.content, next.tags, next.is_pinned, next.archived, now, id)
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
  const exists = await db.prepare('SELECT id FROM todo_folders WHERE id = ?').bind(id).first<{ id: number }>()
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
  if (folderId !== null) {
    const exists = await db
      .prepare('SELECT count(*) AS n FROM todo_folders WHERE id = ?')
      .bind(folderId)
      .first<{ n: number }>()
    if (!exists || exists.n === 0) throw new BadRequestError('invalid folder')
  }

  const now = nowIso()
  const res = await db
    .prepare(
      'INSERT INTO todos (folder_id, content, is_done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)',
    )
    .bind(folderId, content, now, now)
    .run()

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
    .prepare('SELECT id, folder_id, content, is_done, created_at, updated_at FROM todos WHERE id = ?')
    .bind(id)
    .first<TodoRow>()
  if (!row) throw new NotFoundError('todo not found')

  const contentChanged = patch.content !== undefined && patch.content !== row.content
  const doneChanged = patch.isDone !== undefined && patch.isDone !== (row.is_done === 1)

  // 没有实际变化：不写库、不动 updated_at。
  if (!contentChanged && !doneChanged) return toTodo(row)

  const content = contentChanged ? patch.content! : row.content
  const isDone = doneChanged ? (patch.isDone ? 1 : 0) : row.is_done
  const now = nowIso()

  await db
    .prepare('UPDATE todos SET content = ?, is_done = ?, updated_at = ? WHERE id = ?')
    .bind(content, isDone, now, id)
    .run()

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
