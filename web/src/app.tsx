import type { ComponentChildren } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { createNote, deleteNote, fetchNotes, fetchStats, fetchTags, getBaseUrl, getToken, updateNote } from './api'
import { Composer } from './components/Composer'
import { NoteCard } from './components/NoteCard'
import { SettingsDialog } from './components/SettingsDialog'
import type { NavKind } from './components/Sidebar'
import { Sidebar } from './components/Sidebar'
import { Spinner } from './components/Spinner'
import { ToastHost, toast } from './components/Toast'
import { TopBar } from './components/TopBar'
import { TodoView } from './components/TodoView'
import { CalendarToday, Close, CloudOff, EditNote, Refresh, Tag, Tune } from './icons'
import type { Note, Stats, TagStat } from './types'
import { usePullToRefresh } from './pullToRefresh'
import { useThemeMode } from './theme'
import { todayStr } from './util'

/** 当前的筛选条件，四者一起决定列表内容。 */
interface Filters {
  archived: boolean
  tag: string | null
  date: string | null
  query: string
}

const NO_STATS: Stats = { active: 0, archived: 0, total: 0, todos_open: 0 }

/** 主视图：闪念卡片流 / 待办本。 */
type View = 'notes' | 'todos'

/** RFC3339 时间 → 浏览器本地日期（YYYY-MM-DD），与服务端 date 筛选语义一致。 */
function localDateOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 新创建的卡片是否应该出现在当前筛选视图里。 */
function noteMatchesFilters(note: Note, f: Filters): boolean {
  if (note.archived !== f.archived) return false
  if (f.tag !== null && !note.tags.includes(f.tag)) return false
  if (f.date !== null && localDateOf(note.created_at) !== f.date) return false
  if (f.query !== '' && !note.content.toLowerCase().includes(f.query.toLowerCase())) {
    return false
  }
  return true
}

/** 按后端排序规则（置顶优先，再按 updated_at 倒序）插入一张新卡片。 */
function insertNoteInOrder(list: Note[], note: Note): Note[] {
  const time = (n: Note) => {
    const t = Date.parse(n.updated_at)
    return Number.isNaN(t) ? 0 : t
  }
  return [...list, note].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
    return time(b) - time(a)
  })
}

export function App() {
  const [view, setView] = useState<View>('notes')
  /** 首次打开待办本后才挂载；之后保持挂载，切回来不会丢文件夹选择/排序/草稿。 */
  const [todosVisited, setTodosVisited] = useState(false)
  /** 递增后让已挂载的 TodoView 重新拉一次数据（切回待办本 / 改完服务器配置）。 */
  const [todosRefreshKey, setTodosRefreshKey] = useState(0)
  const [filters, setFilters] = useState<Filters>({
    archived: false,
    tag: null,
    date: null,
    query: '',
  })
  /** 与 filters 同步的 ref：refresh() 里读它，保证拿到的是最新筛选条件。 */
  const filtersRef = useRef(filters)

  const [notes, setNotes] = useState<Note[]>([])
  const [tags, setTags] = useState<TagStat[]>([])
  const [stats, setStats] = useState<Stats>(NO_STATS)
  /** 只在首次加载 / 重试时转圈；普通刷新保持列表可见。 */
  const [loading, setLoading] = useState(true)
  /** 是否有请求在飞（切 tab、换筛选、搜索都算）——顶部的细进度条看它。 */
  const [busy, setBusy] = useState(false)
  /** 进度条延迟显示：本机／局域网很快时别闪一下，只有真的慢才出来。 */
  const [showBusyBar, setShowBusyBar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchBusy, setSearchBusy] = useState(false)
  /** 正在编辑的卡片 id，父级统一控制 → 同一时间只有一张卡能编辑。 */
  const [editingId, setEditingId] = useState<number | null>(null)
  /** 本次刷新里"新出现"的卡片，只有它们播入场动画。 */
  const [entering, setEntering] = useState<ReadonlySet<number>>(new Set<number>())
  const [drawerOpen, setDrawerOpen] = useState(false)
  /** 搜索框里的文字。和 filters.query 分开：打字只改这里，回车（或手机键盘的搜索键）才真正查。 */
  const [queryInput, setQueryInput] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [columns, setColumns] = useState(1)
  /** 主题模式（跟随系统 / 浅色 / 深色），持久化在 localStorage，改完立刻生效。 */
  const [theme, setTheme] = useThemeMode()

  const notesRef = useRef<Note[]>([])
  /** 刷新请求序号：快速切换筛选时丢弃过期响应，避免旧结果覆盖新结果。 */
  const seqRef = useRef(0)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  /** 列表滚动容器：下拉刷新的手势挂在它身上。 */
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const today = todayStr()

  /** 拉取列表 + 侧栏数据，三份并行请求。 */
  const refresh = useCallback(async (opts: { showSpinner?: boolean } = {}) => {
    const f = filtersRef.current
    const seq = ++seqRef.current

    if (opts.showSpinner) {
      setLoading(true)
      setError(null)
    }
    if (f.query) setSearchBusy(true)
    setBusy(true)

    try {
      const [list, tagList, st] = await Promise.all([
        fetchNotes({ archived: f.archived, tag: f.tag, query: f.query, date: f.date }),
        fetchTags(),
        fetchStats(),
      ])

      if (seq !== seqRef.current) return // 过期响应，丢弃

      const prevIds = new Set(notesRef.current.map((n) => n.id))
      notesRef.current = list
      setNotes(list)
      setEntering(new Set(list.filter((n) => !prevIds.has(n.id)).map((n) => n.id)))
      setTags(tagList)
      setStats(st)
      // 正在编辑的卡片若被删掉 / 移出当前视图，就退出编辑态
      setEditingId((id) => (id !== null && !list.some((n) => n.id === id) ? null : id))
      setLoading(false)
      setError(null)
      setSearchBusy(false)
    } catch (e) {
      if (seq !== seqRef.current) return
      const message = errText(e)
      // 首次加载失败才整页报错；后台刷新失败保留已有列表，只弹 toast。
      if (opts.showSpinner || notesRef.current.length === 0) {
        setError(message)
      } else {
        setError(null)
      }
      setLoading(false)
      setSearchBusy(false)
      toast(message)
      // 首次打开时本地还没有口令 → 后端必然回 401。
      // 这时直接把「服务器配置」弹出来并给一句中文提示，
      // 免得用户只看到「未授权」的报错页，不知道下一步该干嘛。
      if (statusOf(e) === 401 && !getToken()) {
        setSettingsOpen(true)
        toast(`请输入访问密码（服务器：${getBaseUrl() || location.origin}）`)
      }
    } finally {
      // 进度条只认最新一次请求：旧请求先回来时不能把它提前收掉
      if (seq === seqRef.current) setBusy(false)
    }
  }, [])

  /** 只刷新侧栏计数：待办本里改动后调用，不必把闪念列表也重拉一遍。 */
  const refreshStats = useCallback(async () => {
    try {
      setStats(await fetchStats())
    } catch {
      // 计数刷新失败无所谓，不打扰用户
    }
  }, [])

  /** 只刷新标签：新建闪念后后台校准标签计数，不碰列表。 */
  const refreshTags = useCallback(async () => {
    try {
      setTags(await fetchTags())
    } catch {
      // 标签刷新失败无所谓，下次完整刷新会补上
    }
  }, [])

  // 首次加载
  useEffect(() => {
    void refresh({ showSpinner: true })
  }, [refresh])

  // 移动端下拉刷新（桌面没有触摸事件，天然不受影响）
  const { pull, dragging } = usePullToRefresh(scrollerRef, refresh)

  // 卸载时清掉挂着的观察器
  useEffect(
    () => () => {
      resizeObserverRef.current?.disconnect()
    },
    [],
  )

  // 进度条延迟 120ms 出现：本机/局域网请求很快，没必要闪一下
  useEffect(() => {
    if (!busy) {
      setShowBusyBar(false)
      return
    }
    const timer = window.setTimeout(() => setShowBusyBar(true), 120)
    return () => window.clearTimeout(timer)
  }, [busy])

  /** 更新筛选条件：同步写 ref，这样紧接着的 refresh() 一定读到新值。 */
  function applyFilters(next: Partial<Filters>) {
    const merged = { ...filtersRef.current, ...next }
    filtersRef.current = merged
    setFilters(merged)
  }

  // ---- 筛选交互 ----

  function nav(kind: NavKind) {
    if (kind === 'today') {
      const already = filtersRef.current.date === today
      applyFilters({ archived: false, tag: null, date: already ? null : today })
    } else if (kind === 'all') {
      applyFilters({ archived: false, tag: null, date: null })
    } else {
      applyFilters({ archived: true, tag: null, date: null })
    }
    setView('notes')
    setDrawerOpen(false)
    void refresh()
  }

  /** 切到待办本。 */
  function openTodos() {
    setTodosVisited(true)
    setTodosRefreshKey((k) => k + 1)
    setView('todos')
    setDrawerOpen(false)
  }

  function selectTag(tag: string | null) {
    // 选标签会退出归档视图；「清除」只清标签，不动当前视图
    if (tag === null) applyFilters({ tag: null })
    else applyFilters({ tag, archived: false })
    setView('notes')
    setDrawerOpen(false)
    void refresh()
  }

  function pickDate(date: string | null) {
    if (date === null) applyFilters({ date: null })
    else applyFilters({ date, archived: false })
    setView('notes')
    void refresh()
  }

  /**
   * 打字只更新输入框，不发请求 —— 搜一次就是一次请求，不做逐字符搜索。
   * 例外：把输入框清空视作「取消搜索」，立刻恢复完整列表。
   */
  function onQueryChange(value: string) {
    setQueryInput(value)
    if (value === '' && filtersRef.current.query !== '') {
      applyFilters({ query: '' })
      void refresh()
    }
  }

  /** 开始搜索：回车 / 手机键盘的搜索键触发，一次完整刷新（含侧栏）。 */
  function onSubmitSearch() {
    applyFilters({ query: queryInput.trim() })
    void refresh()
  }

  function onClearQuery() {
    setQueryInput('')
    applyFilters({ query: '' })
    void refresh()
  }

  // ---- 写操作 ----

  /** 执行带错误提示的写操作，完成后刷新列表。 */
  async function runAction(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (e) {
      toast(`操作失败：${errText(e)}`)
    }
    await refresh()
  }

  async function handleCreate(content: string) {
    let note: Note
    try {
      note = await createNote(content)
    } catch (e) {
      toast(`保存失败：${errText(e)}`)
      throw e // 让输入框保留内容，方便重试
    }

    // 已有列表请求在飞时，响应可能不包含刚创建的卡片；
    // 这种少见情况走一次完整刷新，保证不会把新卡片覆盖掉。
    if (busy) {
      await refresh()
      return
    }

    // 用 POST 返回的对象直接插入，避免整表重拉造成列表重排/闪烁。
    // 只有这张卡片确实属于当前筛选条件时才插入；否则只更新侧栏计数。
    if (noteMatchesFilters(note, filtersRef.current)) {
      const next = insertNoteInOrder(notesRef.current, note)
      notesRef.current = next
      setNotes(next)
      setEntering((prev) => new Set(prev).add(note.id))
    }

    setStats((prev) => ({
      ...prev,
      active: prev.active + (note.archived ? 0 : 1),
      archived: prev.archived + (note.archived ? 1 : 0),
      total: prev.total + 1,
    }))

    // 标签计数需要跨卡片统计，后台静默校准，不阻塞输入。
    void refreshTags()
  }

  async function handleUpdateContent(id: number, content: string) {
    try {
      await updateNote(id, { content })
    } catch (e) {
      toast(`保存失败：${errText(e)}`)
      throw e // 让卡片保持编辑态，方便重试
    }
    await refresh()
  }

  /** 瀑布流列数：按内容区实际宽度算 —— >1100px 三列，>700px 两列，否则单列。 */
  const setGridEl = useCallback((el: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      setColumns(w > 1100 ? 3 : w > 700 ? 2 : 1)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    resizeObserverRef.current = ro
    update()
  }, [])

  const sidebar = (
    <Sidebar
      stats={stats}
      tags={tags}
      view={view}
      todoCount={stats.todos_open}
      archived={filters.archived}
      selectedTag={filters.tag}
      selectedDate={filters.date}
      today={today}
      theme={theme}
      onNav={nav}
      onOpenTodos={openTodos}
      onSelectTag={selectTag}
      onThemeChange={setTheme}
      onOpenSettings={() => {
        setDrawerOpen(false)
        setSettingsOpen(true)
      }}
    />
  )

  const emptyText =
    filters.query !== ''
      ? `没搜到「${filters.query}」`
      : filters.archived
        ? '归档盒是空的'
        : filters.tag !== null
          ? `#${filters.tag} 下暂无闪念`
          : '暂无闪念，写一条吧'

  return (
    <div class="app-shell flex h-dvh overflow-hidden bg-scaffold text-ink">
      {/* 桌面：左侧 260px 固定侧栏 */}
      <aside class="hidden w-[260px] shrink-0 md:block">{sidebar}</aside>

      <div class="flex min-w-0 flex-1 flex-col">
        {/* 顶栏（搜索 / 日期）只属于闪念流；待办本自带标题栏与排序 */}
        {view === 'notes' && (
          <TopBar
            query={queryInput}
            searchBusy={searchBusy}
            selectedDate={filters.date}
            onQueryChange={onQueryChange}
            onSubmitSearch={onSubmitSearch}
            onClearQuery={onClearQuery}
            onPickDate={pickDate}
            onOpenSidebar={() => setDrawerOpen(true)}
          />
        )}

        <main class="relative min-h-0 flex-1">
          {/* 待办本首次打开后保持挂载，切走只隐藏，文件夹选择/排序/草稿不会重置 */}
          {todosVisited && (
            <div class={view === 'todos' ? 'h-full' : 'hidden'}>
              <TodoView
                refreshKey={todosRefreshKey}
                onOpenSidebar={() => setDrawerOpen(true)}
                onChanged={refreshStats}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </div>
          )}

          {/* 闪念流始终挂载、切到待办本时仅隐藏：下拉刷新的触摸监听不会因切视图而失效 */}
          <div class={view === 'notes' ? 'h-full' : 'hidden'}>
          {/* 界面内刷新：切 tab / 换筛选时顶部的细进度条 */}
          {showBusyBar && !loading && <div class="loading-bar" aria-hidden="true" />}

          {/* 下拉刷新指示器：跟着手指张开，刷新期间保持 */}
          <div
            class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-end justify-center overflow-hidden"
            style={{ height: `${pull}px`, opacity: pull > 0 ? 1 : 0 }}
          >
            <span class="mb-2.5 text-ink-2">
              <Spinner size={20} width={2.4} />
            </span>
          </div>

          <div
            ref={scrollerRef}
            aria-busy={busy}
            class="h-full overflow-y-auto"
            style={{
              transform: pull > 0 ? `translateY(${pull}px)` : undefined,
              // 手指还在拖时不能有过渡，否则跟不上手；松手后再补一段回弹动画
              transition: dragging
                ? 'none'
                : 'transform 220ms cubic-bezier(0.215, 0.61, 0.355, 1)',
            }}
          >
            {loading ? (
            <div class="grid h-[60vh] place-items-center">
              <Spinner size={36} width={3} />
            </div>
          ) : error !== null ? (
            <div class="flex flex-col items-center px-6 py-20 text-center">
              <CloudOff size={54} class="text-danger" />
              <h2 class="mt-4 mb-0 text-[18px] font-medium text-ink">无法连接到后端服务</h2>
              <p class="mt-2 mb-0 max-w-[560px] text-[13px] leading-relaxed break-words text-ink-2">
                {error}
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-2 rounded-btn bg-lime px-4 py-2.5 text-[14px] font-bold text-lime-on hover:brightness-95"
                  onClick={() => void refresh({ showSpinner: true })}
                >
                  <Refresh size={18} />
                  重试
                </button>
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-line px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Tune size={18} />
                  服务器设置
                </button>
              </div>
            </div>
          ) : (
            <div class="mx-auto w-full max-w-[1400px] px-6 pt-5 pb-6">
              {/* 归档盒里没有"新建"的语义，输入卡只出现在非归档视图 */}
              {!filters.archived && (
                <>
                  <Composer onSave={handleCreate} />
                  <div class="h-[18px]" />
                </>
              )}

              {(filters.date !== null || filters.tag !== null) && (
                <div class="mb-4 flex flex-wrap items-center gap-2">
                  <span class="text-[13px] font-medium text-ink-2">当前过滤：</span>
                  {filters.date !== null && (
                    <FilterChip
                      icon={<CalendarToday size={14} />}
                      label={`日期: ${filters.date}`}
                      onClear={() => pickDate(null)}
                    />
                  )}
                  {filters.tag !== null && (
                    <FilterChip
                      icon={<Tag size={14} />}
                      label={`#${filters.tag}`}
                      onClear={() => selectTag(null)}
                    />
                  )}
                </div>
              )}

              {notes.length === 0 ? (
                <div class="flex flex-col items-center py-[60px] text-center">
                  <EditNote size={72} class="text-lime/60" />
                  <p class="mt-4 mb-0 text-[17px] font-medium text-ink">{emptyText}</p>
                </div>
              ) : (
                <div ref={setGridEl} class="masonry" style={{ columnCount: columns }}>
                  {notes.map((note, index) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      index={index}
                      entering={entering.has(note.id)}
                      editing={editingId === note.id}
                      onStartEdit={() => setEditingId(note.id)}
                      onStopEdit={() => setEditingId(null)}
                      onTogglePin={() =>
                        runAction(() => updateNote(note.id, { is_pinned: !note.is_pinned }))
                      }
                      onToggleArchive={() =>
                        runAction(() => updateNote(note.id, { archived: !note.archived }))
                      }
                      onDelete={() => runAction(() => deleteNote(note.id))}
                      onUpdateContent={(content) => handleUpdateContent(note.id, content)}
                      onTagTap={(tag) => selectTag(tag.toLowerCase())}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
          </div>
        </main>
      </div>

      {/* 窄屏：侧栏收进抽屉 */}
      {drawerOpen && (
        <div class="fixed inset-0 z-40 md:hidden">
          <div
            class="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            class="drawer-enter absolute inset-y-0 left-0 w-[260px] bg-sidebar shadow-dialog"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {sidebar}
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false)
            setEditingId(null)
            setTodosRefreshKey((k) => k + 1)
            void refresh({ showSpinner: true })
          }}
        />
      )}

      <ToastHost />
    </div>
  )
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/** 取 API 错误里的 HTTP 状态码；不是 HTTP 错误（网络失败等）时返回 undefined。 */
function statusOf(e: unknown): number | undefined {
  const status = (e as { status?: unknown } | null)?.status
  return typeof status === 'number' ? status : undefined
}

/** 「当前过滤」条上的一枚可删除胶囊。 */
function FilterChip({
  icon,
  label,
  onClear,
}: {
  icon: ComponentChildren
  label: string
  onClear: () => void
}) {
  return (
    <span class="inline-flex items-center gap-1.5 rounded-chip bg-surface-2 py-1 pr-1 pl-2.5 text-[13px] text-ink">
      <span class="text-ink-2">{icon}</span>
      <span class="max-w-[260px] truncate">{label}</span>
      <button
        type="button"
        title="清除这个筛选"
        aria-label="清除这个筛选"
        class="grid h-5 w-5 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
        onClick={onClear}
      >
        <Close size={14} />
      </button>
    </span>
  )
}
