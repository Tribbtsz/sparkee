/**
 * 端到端验证：直接 import 前端的 src/api.ts，对着真实运行中的 Worker 跑一遍。
 *
 * 关键点是"复用前端自己的代码"——字段名（is_pinned / is_done / archived）、
 * PUT 的局部更新语义、401 / 404 的中文提示，全都走的是线上同一套实现，
 * 而不是在脚本里再手写一遍请求。
 *
 * 用法：node scripts/e2e-api.ts   （Node 24 原生支持直接跑 .ts）
 * 前置：`cd worker && pnpm db:migrate:local && pnpm dev`（端口 8787，未开启鉴权）。
 */

const TEST_BASE = (process.env.SPARKEE_TEST_BASE ?? 'http://127.0.0.1:8787').replace(/\/+$/, '')

// ---- 浏览器全局的最小替身（api.ts 只用到这几个）----
const storage = new Map<string, string>()

// 本地/CI 用 .dev.vars 里的口令时，把同一份令牌塞进 localStorage 替身。
const TEST_TOKEN = (process.env.SPARKEE_TEST_TOKEN ?? '').trim()
if (TEST_TOKEN) storage.set('sparkee_server_token', TEST_TOKEN)

Object.defineProperty(globalThis, 'location', {
  value: { origin: TEST_BASE },
  configurable: true,
})

// api.ts 用 window.setTimeout（浏览器里返回 number），Node 下给个替身即可
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })

// 浏览器会把相对 URL 按当前页面解析，Node 的 fetch 不会 —— 这里补上这一步，
// 顺便记下每次请求的真实 URL，用来断言"同源时确实走的是相对路径 /api/..."。
const requestedUrls: string[] = []
const realFetch = globalThis.fetch
Object.defineProperty(globalThis, 'fetch', {
  value: (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : String(input)
    const url = raw.startsWith('/') ? `${TEST_BASE}${raw}` : raw
    requestedUrls.push(url)
    return realFetch(url, init)
  },
  configurable: true,
})

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, String(v)),
    removeItem: (k: string) => void storage.delete(k),
  },
  configurable: true,
})

const api = await import('../src/api.ts')
const { formatTime, tagsOf, bodyOf, removeTag, appendTag } = await import('../src/util.ts')

let passed = 0
const failures: string[] = []

function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) {
    passed++
    console.log(`  \u2713 ${name}`)
  } else {
    failures.push(name)
    console.log(`  \u2717 ${name}${extra === undefined ? '' : `  -> ${JSON.stringify(extra)}`}`)
  }
}

function eq(name: string, actual: unknown, expected: unknown) {
  check(
    `${name} (期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)})`,
    actual === expected,
  )
}

async function expectMessage(name: string, fn: () => Promise<unknown>, includes: string) {
  try {
    await fn()
    check(`${name}（期望报错，实际成功了）`, false)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    check(`${name}：${msg}`, msg.includes(includes))
  }
}

// ---------------------------------------------------------------- 纯函数
console.log('\n[1] util.ts 纯函数（标签 / 正文 / 时间）')
eq('tagsOf 去重且保留大小写', tagsOf('#Work #work #工作-内容 正文').join('|'), 'Work|工作-内容')
eq('bodyOf 剥离标签', bodyOf('#a 你好  世界\n#b '), '你好 世界')
eq('removeTag 不误伤更长标签', removeTag('#工作内容 和 #工作 都要', '工作'), '#工作内容 和 都要')
eq('appendTag 追加到末尾', appendTag('正文', '  #灵感 '), '正文 #灵感 ')
eq('appendTag 非法输入不写入', appendTag('正文', '   '), '正文')
check('formatTime 刚刚', formatTime(new Date().toISOString()) === '刚刚')
check(
  'formatTime 分钟前',
  formatTime(new Date(Date.now() - 5 * 60_000).toISOString()) === '5分钟前',
  formatTime(new Date(Date.now() - 5 * 60_000).toISOString()),
)
eq(
  'formatTime 老日期用 yyyy-MM-dd HH:mm',
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(formatTime('2020-06-01T04:00:00Z')),
  true,
)
eq(
  '同一时刻的不同时区写法渲染一致（偏移被正确换算成本地时间）',
  formatTime('2020-06-01T12:00:00+08:00'),
  formatTime('2020-06-01T04:00:00Z'),
)

// ---------------------------------------------------------------- 基础连通
console.log('\n[2] 连通性与 /api/stats')
eq('未配置服务器地址时 url 为空（走同源相对路径）', api.getBaseUrl(), '')
const baseStats = await api.fetchStats()
check(
  `fetchStats 拿到 active/archived/total：${JSON.stringify(baseStats)}`,
  typeof baseStats.active === 'number',
)
check(
  `请求确实打到 /api/stats：${requestedUrls.at(-1)}`,
  requestedUrls.at(-1) === `${TEST_BASE}/api/stats`,
)

// ---------------------------------------------------------------- 建
console.log('\n[3] POST /api/notes（创建）')
const marker = `e2e-${Date.now()}`
const created = await api.createNote(`E2E 原始内容 #${marker} #工作`)
eq('id 是数字', typeof created.id, 'number')
eq('content 原样返回', created.content, `E2E 原始内容 #${marker} #工作`)
check(
  'tags 已抽出且小写',
  JSON.stringify(created.tags) === JSON.stringify([marker.toLowerCase(), '工作']),
  created.tags,
)
eq('is_pinned=false', created.is_pinned, false)
eq('archived=false', created.archived, false)
check(
  'created_at 可被 new Date 解析',
  !Number.isNaN(new Date(created.created_at).getTime()),
  created.created_at,
)
check(
  'created_at 是带时区的 RFC3339（UTC 时为 Z）',
  /(?:Z|[+-]\d{2}:\d{2})$/.test(created.created_at),
  created.created_at,
)

// ---------------------------------------------------------------- 改（内容）
console.log('\n[4] PUT /api/notes/{id}（局部更新）')
const renamed = await api.updateNote(created.id, { content: `E2E 改过的内容 #${marker}` })
eq('content 已更新', renamed.content, `E2E 改过的内容 #${marker}`)
eq('tags 跟着重算', renamed.tags.join('|'), marker.toLowerCase())
check(
  'updated_at >= created_at',
  new Date(renamed.updated_at).getTime() >= new Date(created.created_at).getTime(),
)

const pinned = await api.updateNote(created.id, { is_pinned: true })
eq('只传 is_pinned：置顶生效', pinned.is_pinned, true)
eq('只传 is_pinned：content 不受影响', pinned.content, `E2E 改过的内容 #${marker}`)

// ---------------------------------------------------------------- 查（搜索 / 标签 / 日期）
console.log('\n[5] GET /api/notes 的筛选参数')
const byQuery = await api.fetchNotes({ query: '改过的内容' })
check(
  `q= 搜到目标卡片`,
  byQuery.some((n) => n.id === created.id),
  byQuery.map((n) => n.id),
)
const byTag = await api.fetchNotes({ tag: marker })
check(
  `tag= 搜到目标卡片`,
  byTag.some((n) => n.id === created.id),
  byTag.map((n) => n.id),
)
const today = new Date()
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
const byDate = await api.fetchNotes({
  date: dateStr,
  tz: -new Date().getTimezoneOffset(),
})
check(
  `date=${dateStr} 搜到目标卡片`,
  byDate.some((n) => n.id === created.id),
  byDate.map((n) => n.id),
)
const activeList = await api.fetchNotes({})
check(
  'archived=false 的列表里有它',
  activeList.some((n) => n.id === created.id),
)
check('置顶卡片排在最前（is_pinned DESC）', activeList[0].id === created.id, activeList[0].id)

// ---------------------------------------------------------------- 归档
console.log('\n[6] 归档 / 移出归档 / 标签计数')
const archived = await api.updateNote(created.id, { archived: true })
eq('archived=true', archived.archived, true)
eq('置顶状态保留', archived.is_pinned, true)
const archivedList = await api.fetchNotes({ archived: true })
check(
  '归档视图里有它',
  archivedList.some((n) => n.id === created.id),
)
const activeAfterArchive = await api.fetchNotes({})
check('未归档视图里没有它', !activeAfterArchive.some((n) => n.id === created.id))

const statsArchived = await api.fetchStats()
eq('stats.archived 比基线 +1', statsArchived.archived, baseStats.archived + 1)
eq('stats.active 与基线相同', statsArchived.active, baseStats.active)
eq('total = active + archived', statsArchived.total, statsArchived.active + statsArchived.archived)

const tagsWhileArchived = await api.fetchTags()
check('归档中的标签不进 /api/tags', !tagsWhileArchived.some((t) => t.name === marker.toLowerCase()))

const restored = await api.updateNote(created.id, { archived: false })
eq('archived=false', restored.archived, false)
const tagsAfterRestore = await api.fetchTags()
const tagEntry = tagsAfterRestore.find((t) => t.name === marker.toLowerCase())
check('/api/tags 里出现该标签且 count>=1', !!tagEntry && tagEntry.count >= 1, tagEntry)

// ---------------------------------------------------------------- 错误路径
console.log('\n[7] 错误路径与提示文案')
await expectMessage(
  '内容改成空白 → 400',
  () => api.updateNote(created.id, { content: '   ' }),
  '更新闪念失败 400',
)
await expectMessage(
  '更新不存在的 id → 404',
  () => api.updateNote(99999999, { content: 'x' }),
  '更新闪念失败 404',
)
await expectMessage('删除不存在的 id → 404', () => api.deleteNote(99999999), '删除闪念失败 404')
await expectMessage('创建空白内容 → 400', () => api.createNote('   '), '创建闪念失败 400')

// 401 分支：本地服务没开鉴权，改用"指向一个不存在的地址"验证连接失败文案
api.setBaseUrl('http://127.0.0.1:59999')
const offlineMsg = await api.fetchNotes({}).then(
  () => '(没有报错)',
  (e: unknown) => (e instanceof Error ? e.message : String(e)),
)
check(`连不上服务器时给出中文提示：${offlineMsg}`, offlineMsg.includes('无法连接服务器'))
api.setBaseUrl('') // 复位成同源
eq('setBaseUrl 复位后走相对路径', api.getBaseUrl(), '')

// ---------------------------------------------------------------- 删
console.log('\n[8] DELETE /api/notes/{id}')
await api.deleteNote(created.id)
const finalList = await api.fetchNotes({})
check('删除后列表里没有它', !finalList.some((n) => n.id === created.id))
const finalStats = await api.fetchStats()
eq('stats 回到基线 active', finalStats.active, baseStats.active)
eq('stats 回到基线 archived', finalStats.archived, baseStats.archived)
const finalTags = await api.fetchTags()
check('标签也随删除消失', !finalTags.some((x) => x.name === marker.toLowerCase()))

// ---------------------------------------------------------------- 待办本
console.log('\n[9] 待办本（文件夹 / 待办 / 排序 / 完成态）')
const folder = await api.createTodoFolder(`E2E项目-${marker}`)
eq('文件夹名原样返回', folder.name, `E2E项目-${marker}`)
eq('新文件夹未完成计数为 0', folder.open_count, 0)

const tf1 = await api.createTodo('E2E 待办一', folder.id)
const tf2 = await api.createTodo('E2E 待办二', folder.id)
const tf3 = await api.createTodo('E2E 未分类待办', null)
eq('folder_id 归属正确', tf1.folder_id, folder.id)
eq('未分类的 folder_id 为 null', tf3.folder_id, null)
eq('新待办默认未完成', tf1.is_done, false)
check(
  '待办也带创建/修改时间',
  !Number.isNaN(new Date(tf1.created_at).getTime()) &&
    !Number.isNaN(new Date(tf1.updated_at).getTime()),
)

const inFolder = await api.fetchTodos({ folder: folder.id, sort: 'created', order: 'asc' })
check(
  '按文件夹过滤：只返回该文件夹的待办',
  inFolder.every((t) => t.folder_id === folder.id),
  inFolder.map((t) => t.id),
)
check(
  '该文件夹里有刚建的两条',
  [tf1.id, tf2.id].every((id) => inFolder.some((t) => t.id === id)),
  inFolder.map((t) => t.id),
)
eq('创建时间正序：先建的在前', inFolder[0].id, tf1.id)

const noneBucket = await api.fetchTodos({ folder: 'none' })
check(
  'folder=none 拿到未分类待办',
  noneBucket.some((t) => t.id === tf3.id),
)

const done = await api.updateTodo(tf1.id, { is_done: true })
eq('勾选后 is_done=true', done.is_done, true)
check(
  '勾选会刷新 updated_at',
  new Date(done.updated_at).getTime() >= new Date(tf1.created_at).getTime(),
)
const afterDone = await api.fetchTodos({ folder: folder.id, sort: 'created', order: 'asc' })
eq('已完成的沉底（未完成的排最前）', afterDone[0].id, tf2.id)

const renamedTodo = await api.updateTodo(tf2.id, { content: 'E2E 待办二（改）' })
eq('待办内容可改', renamedTodo.content, 'E2E 待办二（改）')

const renamedFolder = await api.renameTodoFolder(folder.id, `E2E项目改-${marker}`)
eq('文件夹改名生效', renamedFolder.name, `E2E项目改-${marker}`)
const fEntry = (await api.fetchTodoFolders()).find((f) => f.id === folder.id)
eq('文件夹未完成计数只算未完成的', fEntry?.open_count, 1)

const todoStats = await api.fetchStats()
check('stats.todos_open 计入未完成待办', todoStats.todos_open >= 2, todoStats.todos_open)

await expectMessage('创建空白待办 → 400', () => api.createTodo('   ', null), '创建待办失败 400')
await expectMessage('空白文件夹名 → 400', () => api.createTodoFolder('  '), '创建文件夹失败 400')
await expectMessage(
  '更新不存在的待办 → 404',
  () => api.updateTodo(99999999, { content: 'x' }),
  '更新待办失败 404',
)
await expectMessage(
  '删除不存在的文件夹 → 404',
  () => api.deleteTodoFolder(99999999),
  '删除文件夹失败 404',
)

// 删文件夹要级联删掉它的待办；未分类的待办不受影响
await api.deleteTodoFolder(folder.id)
const afterFolderDelete = await api.fetchTodos({})
check(
  '删文件夹后它的待办也没了',
  !afterFolderDelete.some((t) => t.id === tf1.id || t.id === tf2.id),
)
await api.deleteTodo(tf3.id)
check('未分类待办可单独删除', !(await api.fetchTodos({})).some((t) => t.id === tf3.id))
eq('收尾后 todos_open 回到基线', (await api.fetchStats()).todos_open, baseStats.todos_open)

// ---------------------------------------------------------------- 汇总
console.log(`\n通过 ${passed} 项，失败 ${failures.length} 项`)
if (failures.length > 0) {
  for (const f of failures) console.log(`  FAIL: ${f}`)
  process.exit(1)
}
console.log('全部通过 ✅')
