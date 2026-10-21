/**
 * Sparkee API —— Cloudflare Worker + D1，路由用 Hono。
 *
 *   GET    /api/health
 *   GET    /api/stats
 *   GET    /api/tags
 *   GET    /api/notes?archived&tag&q&date&tz
 *   POST   /api/notes
 *   PUT    /api/notes/{id}
 *   DELETE /api/notes/{id}
 *   GET    /api/todo-folders
 *   POST   /api/todo-folders
 *   PUT    /api/todo-folders/{id}
 *   DELETE /api/todo-folders/{id}
 *   GET    /api/todos?folder&sort&order
 *   POST   /api/todos
 *   PUT    /api/todos/{id}
 *   DELETE /api/todos/{id}
 *
 * 鉴权：Bearer 口令（Worker secret SPARKEE_TOKEN）。
 * 静态文件由 Workers Assets 托管，/api/* 之外的请求不会进这里。
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'

import {
  BadRequestError,
  NotFoundError,
  createNote,
  createTodo,
  createTodoFolder,
  deleteNote,
  deleteTodo,
  deleteTodoFolder,
  getTags,
  listNotes,
  listTodoFolders,
  listTodos,
  renameTodoFolder,
  stats,
  updateNote,
  updateTodo,
} from './store.ts'
import { BadDateError, parseDateInZone, timingSafeEqual } from './util.ts'

const MAX_BODY_BYTES = 1 << 20
const app = new Hono<{ Bindings: Env }>()

// 所有 API 响应都不缓存；写操作也不要被中间层缓存。
app.use('/api/*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
})

// 同源、本机回环（本地用 5173 跑前端）放行；PWA 与 API 同源，正常用不到。
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const self = new URL(c.req.url).origin
      return originAllowed(origin, self) ? origin : undefined
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
)

// 探活公开，且顺便确认 D1 还能用。注册在鉴权中间件之前。
app.get('/api/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>()
    return c.json({ status: 'ok', app: 'sparkee' })
  } catch (err) {
    console.error('健康检查失败:', err)
    return c.json({ status: 'error', app: 'sparkee' }, 503)
  }
})

app.use('/api/*', async (c, next) => {
  const expected = (c.env.SPARKEE_TOKEN ?? '').trim()
  if (expected === '') return next()

  const header = c.req.header('Authorization') ?? ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  if (!timingSafeEqual(header.slice(7).trim(), expected)) {
    return c.json({ error: 'unauthorized' }, 401)
  }
  return next()
})

app.get('/api/stats', async (c) => c.json(await stats(c.env.DB)))
app.get('/api/tags', async (c) => c.json(await getTags(c.env.DB)))

// ---------------------------------------------------------------- notes

app.get('/api/notes', async (c) => {
  const archived = c.req.query('archived') === 'true'
  const tag = c.req.query('tag') ?? ''
  const query = c.req.query('q') ?? ''
  const dateStr = c.req.query('date') ?? ''
  const tzRaw = c.req.query('tz')

  let tzMinutes = 0
  if (tzRaw !== undefined && tzRaw !== '') {
    if (!/^[+-]?\d+$/.test(tzRaw)) return c.text('invalid tz', 400)
    tzMinutes = Number(tzRaw)
  }

  let dateStart: number | null = null
  let dateEnd: number | null = null
  if (dateStr !== '') {
    dateStart = parseDateInZone(dateStr, tzMinutes)
    dateEnd = dateStart + 86_400_000
  }

  return c.json(await listNotes(c.env.DB, { archived, tag, query, dateStart, dateEnd }))
})

app.post('/api/notes', async (c) => {
  const body = await readJson(c)
  const content = typeof body.content === 'string' ? body.content : ''
  if (content.trim() === '') throw new BadRequestError('content cannot be empty')
  return c.json(await createNote(c.env.DB, content), 201)
})

app.put('/api/notes/:id', async (c) => {
  const id = parseId(c.req.param('id'), 'Invalid note ID')
  const body = await readJson(c)
  if (typeof body.content === 'string' && body.content.trim() === '') {
    throw new BadRequestError('content cannot be empty')
  }

  return c.json(
    await updateNote(c.env.DB, id, {
      content: typeof body.content === 'string' ? body.content : undefined,
      isPinned: typeof body.is_pinned === 'boolean' ? body.is_pinned : undefined,
      archived: typeof body.archived === 'boolean' ? body.archived : undefined,
    }),
  )
})

app.delete('/api/notes/:id', async (c) => {
  await deleteNote(c.env.DB, parseId(c.req.param('id'), 'Invalid note ID'))
  return c.json({ message: 'deleted' })
})

// ---------------------------------------------------------------- todos

app.get('/api/todo-folders', async (c) => c.json(await listTodoFolders(c.env.DB)))

app.post('/api/todo-folders', async (c) => {
  const body = await readJson(c)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name === '') throw new BadRequestError('name cannot be empty')
  return c.json(await createTodoFolder(c.env.DB, name), 201)
})

app.put('/api/todo-folders/:id', async (c) => {
  const id = parseId(c.req.param('id'), 'Invalid folder ID')
  const body = await readJson(c)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name === '') throw new BadRequestError('name cannot be empty')
  return c.json(await renameTodoFolder(c.env.DB, id, name))
})

app.delete('/api/todo-folders/:id', async (c) => {
  await deleteTodoFolder(c.env.DB, parseId(c.req.param('id'), 'Invalid folder ID'))
  return c.json({ message: 'deleted' })
})

app.get('/api/todos', async (c) => {
  const folder = c.req.query('folder') ?? ''
  const sortKey = c.req.query('sort') ?? ''
  const desc = c.req.query('order') === 'desc'
  return c.json(await listTodos(c.env.DB, folder, sortKey, desc))
})

app.post('/api/todos', async (c) => {
  const body = await readJson(c)
  const content = typeof body.content === 'string' ? body.content.trim() : ''
  if (content === '') throw new BadRequestError('content cannot be empty')
  const folderId =
    typeof body.folder_id === 'number' && Number.isInteger(body.folder_id) ? body.folder_id : null
  return c.json(await createTodo(c.env.DB, folderId, content), 201)
})

app.put('/api/todos/:id', async (c) => {
  const id = parseId(c.req.param('id'), 'Invalid todo ID')
  const body = await readJson(c)
  if (typeof body.content === 'string' && body.content.trim() === '') {
    throw new BadRequestError('content cannot be empty')
  }
  return c.json(
    await updateTodo(c.env.DB, id, {
      content: typeof body.content === 'string' ? body.content : undefined,
      isDone: typeof body.is_done === 'boolean' ? body.is_done : undefined,
    }),
  )
})

app.delete('/api/todos/:id', async (c) => {
  await deleteTodo(c.env.DB, parseId(c.req.param('id'), 'Invalid todo ID'))
  return c.json({ message: 'deleted' })
})

// 方法不对时给 405，而不是 Hono 默认的 404。
for (const path of [
  '/api/stats',
  '/api/tags',
  '/api/notes',
  '/api/notes/:id',
  '/api/todo-folders',
  '/api/todo-folders/:id',
  '/api/todos',
  '/api/todos/:id',
]) {
  app.all(path, (c) => c.text('Method not allowed', 405))
}

app.notFound((c) => c.text('404 page not found', 404))

app.onError((err, c) => {
  if (err instanceof NotFoundError) return c.text(err.message, 404)
  if (err instanceof BadRequestError) return c.text(err.message, 400)
  if (err instanceof BadDateError) return c.text('invalid date', 400)
  console.error('API 内部错误:', err)
  return c.text('internal server error', 500)
})

export default app

// ---------------------------------------------------------------- helpers

function parseId(raw: string | undefined, message: string): number {
  if (!raw || !/^\d+$/.test(raw)) throw new BadRequestError(message)
  const id = Number(raw)
  if (!Number.isSafeInteger(id)) throw new BadRequestError(message)
  return id
}

async function readJson(c: Context<{ Bindings: Env }>) {
  const declared = Number(c.req.header('Content-Length') ?? '0')
  if (declared > MAX_BODY_BYTES) throw new BadRequestError('request body too large')

  let parsed: unknown
  try {
    parsed = await c.req.json()
  } catch {
    throw new BadRequestError('invalid json')
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new BadRequestError('invalid json')
  }
  return parsed as Record<string, unknown>
}

function originAllowed(origin: string, selfOrigin: string): boolean {
  if (origin === selfOrigin) return true

  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return false
  }

  return isLoopback(parsed.hostname)}

function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]'
  )
}
