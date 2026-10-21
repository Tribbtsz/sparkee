import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import type { TodoOrder, TodoSort } from '../api'
import {
  createTodo,
  createTodoFolder,
  deleteTodo,
  deleteTodoFolder,
  fetchTodoFolders,
  fetchTodos,
  renameTodoFolder,
  updateTodo,
} from '../api'
import { Add, Check, Checklist, CreateNewFolder, Delete, Edit, Folder, Menu, Refresh, Sort, Tune } from '../icons'
import { usePullToRefresh } from '../pullToRefresh'
import type { Todo, TodoFolder } from '../types'
import { autoGrow, cx } from '../util'
import { Spinner } from './Spinner'
import { toast } from './Toast'
import { TodoRow } from './TodoRow'

/** 当前选中的文件夹：全部 / 未分类 / 某个文件夹 id。 */
type FolderSel = 'all' | 'none' | number

interface Props {
  /** 递增时重新加载（切回待办本 / 修改服务器配置后）。 */
  refreshKey: number
  /** 窄屏时打开侧栏抽屉。 */
  onOpenSidebar: () => void
  /** 待办数量变化后回调，让侧栏「待办本」徽标刷新。 */
  onChanged: () => void
  /** 加载失败时提供「服务器设置」入口。 */
  onOpenSettings: () => void
}

/**
 * 待办本。
 *
 * 只做三件事：一级文件夹（项目隔离）、勾选完成、按创建/修改时间排序。
 * 不做优先级、截止时间、标签、提醒——它只是一个有序的备忘清单。
 */
export function TodoView({ refreshKey, onOpenSidebar, onChanged, onOpenSettings }: Props) {
  const [folders, setFolders] = useState<TodoFolder[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** 本次刷新里"新出现"的待办，只有它们播入场动画。 */
  const [entering, setEntering] = useState<ReadonlySet<number>>(new Set<number>())
  const [editingId, setEditingId] = useState<number | null>(null)

  const [sel, setSel] = useState<FolderSel>('all')
  const [sort, setSort] = useState<TodoSort>('created')
  const [order, setOrder] = useState<TodoOrder>('asc')

  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [renameId, setRenameId] = useState<number | null>(null)
  const [renameName, setRenameName] = useState('')

  // 与 state 同步的 ref：load() 里读它们，保证拿到的是最新选择（和 App 的 filtersRef 同理）。
  const selRef = useRef<FolderSel>(sel)
  const sortRef = useRef<TodoSort>(sort)
  const orderRef = useRef<TodoOrder>(order)
  const seqRef = useRef(0)
  const todosRef = useRef<Todo[]>([])

  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const newFolderRef = useRef<HTMLInputElement | null>(null)
  const renameRef = useRef<HTMLInputElement | null>(null)
  /** 列表滚动容器：移动端下拉刷新挂在它身上。 */
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async (opts: { showSpinner?: boolean } = {}) => {
    const seq = ++seqRef.current
    if (opts.showSpinner) {
      setLoading(true)
      setError(null)
    }
    try {
      const [folderList, todoList] = await Promise.all([
        fetchTodoFolders(),
        fetchTodos({
          // 'all' 视图不传 folder（= 全部）；'none' 与具体 id 原样下发。
          folder: selRef.current === 'all' ? undefined : selRef.current,
          sort: sortRef.current,
          order: orderRef.current,
        }),
      ])
      if (seq !== seqRef.current) return // 过期响应，丢弃

      const prevIds = new Set(todosRef.current.map((t) => t.id))
      todosRef.current = todoList
      setFolders(folderList)
      setTodos(todoList)
      setEntering(new Set(todoList.filter((t) => !prevIds.has(t.id)).map((t) => t.id)))
      // 正在编辑的待办若被删掉 / 移出当前视图，就退出编辑态
      setEditingId((id) => (id !== null && !todoList.some((t) => t.id === id) ? null : id))
      setLoading(false)
      setError(null)
    } catch (e) {
      if (seq !== seqRef.current) return
      const message = errText(e)
      // 首次加载失败才整页报错；后台刷新失败保留已有列表，只弹 toast。
      if (opts.showSpinner || todosRef.current.length === 0) {
        setError(message)
      } else {
        setError(null)
        toast(`刷新待办失败：${message}`)
      }
      setLoading(false)
    }
  }, [])

  // 首次挂载和 refreshKey 变化都重新拉取；已有数据时不再整页转圈。
  useEffect(() => {
    void load({ showSpinner: todosRef.current.length === 0 })
  }, [load, refreshKey])

  // 移动端下拉刷新（桌面没有触摸事件，天然不受影响）
  const { pull, dragging } = usePullToRefresh(scrollerRef, load)

  useEffect(() => {
    if (adding) requestAnimationFrame(() => newFolderRef.current?.focus())
  }, [adding])

  useEffect(() => {
    if (renameId !== null) requestAnimationFrame(() => renameRef.current?.focus())
  }, [renameId])

  function chooseFolder(next: FolderSel) {
    selRef.current = next
    setSel(next)
    void load()
  }

  function changeSort(value: string) {
    const [s, o] = value.split(':') as [TodoSort, TodoOrder]
    sortRef.current = s
    orderRef.current = o
    setSort(s)
    setOrder(o)
    void load()
  }

  /**
   * 执行带错误提示的写操作，完成后刷新列表与侧栏计数。
   * rethrow 用于内容编辑：失败时必须让 TodoRow 保持编辑态，不能吞掉异常。
   */
  async function runAction(
    action: () => Promise<unknown>,
    opts: { rethrow?: boolean } = {},
  ) {
    try {
      await action()
    } catch (e) {
      toast(`操作失败：${errText(e)}`)
      await load()
      onChanged()
      if (opts.rethrow) throw e
      return
    }
    await load()
    onChanged()
  }

  async function addTodo() {
    const content = text.trim()
    if (!content || saving) return
    setSaving(true)
    try {
      const folderId = typeof selRef.current === 'number' ? selRef.current : null
      await createTodo(content, folderId)
      setText('')
      if (inputRef.current) inputRef.current.style.height = 'auto'
      await load()
      onChanged()
    } catch (e) {
      toast(`保存失败：${errText(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function addFolder() {
    const name = newName.trim()
    if (!name) {
      setAdding(false)
      return
    }
    try {
      const folder = await createTodoFolder(name)
      setNewName('')
      setAdding(false)
      selRef.current = folder.id
      setSel(folder.id)
      await load()
    } catch (e) {
      toast(`创建文件夹失败：${errText(e)}`)
    }
  }

  async function commitRename() {
    const id = renameId
    if (id === null) return
    const name = renameName.trim()
    if (!name) {
      setRenameId(null)
      return
    }
    try {
      await renameTodoFolder(id, name)
    } catch (e) {
      // 失败时保留输入框和内容，方便直接重试。
      toast(`重命名失败：${errText(e)}`)
      return
    }
    setRenameId(null)
    await load()
  }

  async function removeFolder(id: number) {
    try {
      await deleteTodoFolder(id)
    } catch (e) {
      toast(`删除文件夹失败：${errText(e)}`)
      return
    }
    if (selRef.current === id) {
      selRef.current = 'all'
      setSel('all')
    }
    await load()
    onChanged()
  }

  /** 文件夹 id → 名字；null 归类为「未分类」。 */
  function nameOfFolder(id: number | null): string {
    if (id === null) return '未分类'
    return folders.find((f) => f.id === id)?.name ?? '未分类'
  }

  const showFolderLabel = sel === 'all'
  const targetLabel = typeof sel === 'number' ? nameOfFolder(sel) : '未分类'

  const emptyText =
    sel === 'all'
      ? '还没有待办，写一条吧'
      : sel === 'none'
        ? '未分类里没有待办'
        : `「${nameOfFolder(sel)}」里没有待办`

  return (
    <div class="relative flex h-full flex-col">
      {/* ---- 顶栏：标题 + 排序 ---- */}
      <header class="flex h-16 shrink-0 items-center gap-2 bg-scaffold px-3 md:gap-3 md:px-7">
        <button
          type="button"
          title="菜单"
          aria-label="打开侧栏"
          class="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-black/[0.06] md:hidden dark:hover:bg-white/[0.08]"
          onClick={onOpenSidebar}
        >
          <Menu size={24} />
        </button>

        <span class="flex shrink-0 items-center gap-2 text-[17px] font-extrabold text-ink">
          <Checklist size={22} class="text-ink-2" />
          待办本
        </span>

        <div class="flex-1" />

        <label
          title="排序方式"
          class="relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-capsule bg-surface-2 pr-1 pl-2.5 text-[13px] text-ink"
        >
          <Sort size={16} class="shrink-0 text-ink-2" />
          <select
            value={`${sort}:${order}`}
            class="cursor-pointer appearance-none border-0 bg-transparent pr-1 text-[13px] text-ink outline-none"
            onChange={(e) => changeSort(e.currentTarget.value)}
          >
            <option value="created:asc">创建时间 · 正序</option>
            <option value="created:desc">创建时间 · 倒序</option>
            <option value="updated:asc">修改时间 · 正序</option>
            <option value="updated:desc">修改时间 · 倒序</option>
          </select>
        </label>
      </header>

      {/* ---- 文件夹横条（项目隔离 + 新建） ---- */}
      <div class="shrink-0 border-b border-line">
        <div class="flex items-center gap-2 overflow-x-auto px-3 py-2.5 md:px-7">
          <FolderTab label="全部" selected={sel === 'all'} onClick={() => chooseFolder('all')} />
          <FolderTab label="未分类" selected={sel === 'none'} onClick={() => chooseFolder('none')} />

          {folders.map((f) => {
            const selected = sel === f.id
            if (renameId === f.id) {
              return (
                <span key={f.id} class="inline-flex h-8 shrink-0 items-center gap-1 rounded-capsule bg-surface-2 px-2">
                  <input
                    ref={renameRef}
                    value={renameName}
                    spellcheck={false}
                    class="w-[120px] border-0 bg-transparent text-[13.5px] text-ink outline-none"
                    onInput={(e) => setRenameName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (e.isComposing || e.keyCode === 229) return
                        e.preventDefault()
                        void commitRename()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setRenameId(null)
                      }
                    }}
                    onBlur={() => void commitRename()}
                  />
                </span>
              )
            }
            return (
              <span
                key={f.id}
                class={cx(
                  'inline-flex h-8 shrink-0 items-center gap-1 rounded-capsule pl-2.5 text-[13.5px] whitespace-nowrap',
                  selected
                    ? 'bg-lime-select pr-0.5 font-bold text-lime-on dark:text-white'
                    : 'bg-black/[0.04] pr-2 text-ink hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]',
                )}
              >
                <button
                  type="button"
                  title={`只看「${f.name}」`}
                  class="inline-flex cursor-pointer items-center gap-1.5"
                  onClick={() => chooseFolder(f.id)}
                >
                  <Folder size={15} class="shrink-0 text-ink-2" />
                  <span class="max-w-[180px] truncate">{f.name}</span>
                  {f.open_count > 0 && <span class="text-[12px] text-ink-2">{f.open_count}</span>}
                </button>

                {selected && (
                  <>
                    <button
                      type="button"
                      title="重命名文件夹"
                      aria-label="重命名文件夹"
                      class="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
                      onClick={() => {
                        setRenameId(f.id)
                        setRenameName(f.name)
                      }}
                    >
                      <Edit size={14} />
                    </button>
                    <ArmedDeleteFolder name={f.name} onClick={() => void removeFolder(f.id)} />
                  </>
                )}
              </span>
            )
          })}

          {adding ? (
            <span class="inline-flex h-8 shrink-0 items-center gap-1 rounded-capsule bg-surface-2 px-2">
              <input
                ref={newFolderRef}
                value={newName}
                placeholder="文件夹名"
                spellcheck={false}
                class="w-[120px] border-0 bg-transparent text-[13.5px] text-ink outline-none"
                onInput={(e) => setNewName(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.isComposing || e.keyCode === 229) return
                    e.preventDefault()
                    void addFolder()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setNewName('')
                    setAdding(false)
                  }
                }}
                onBlur={() => {
                  // 失焦且没输入内容就收起，避免留下一个空输入框
                  if (!newName.trim()) setAdding(false)
                }}
              />
              <button
                type="button"
                title="创建"
                aria-label="创建文件夹"
                class="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void addFolder()}
              >
                <Check size={14} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              title="新建文件夹"
              class="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-capsule border border-dashed border-line px-2.5 text-[13.5px] text-ink-2 hover:text-ink"
              onClick={() => {
                setNewName('')
                setAdding(true)
              }}
            >
              <CreateNewFolder size={16} />
              新建文件夹
            </button>
          )}
        </div>
      </div>

      {/* ---- 列表 ---- */}
      <div class="relative min-h-0 flex-1">
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
          class="h-full overflow-y-auto"
          style={{
            transform: pull > 0 ? `translateY(${pull}px)` : undefined,
            // 手指还在拖时不能有过渡，否则跟不上手；松手后再补一段回弹动画
            transition: dragging
              ? 'none'
              : 'transform 220ms cubic-bezier(0.215, 0.61, 0.355, 1)',
          }}
        >
          {/* 内容区宽度 / 内边距与闪念流完全一致（max-w-[1400px] + px-6 + pt-5 pb-6） */}
          <div class="mx-auto w-full max-w-[1400px] px-6 pt-5 pb-6">
          {loading ? (
            <div class="grid h-[60vh] place-items-center">
              <Spinner size={36} width={3} />
            </div>
          ) : error !== null ? (
            <div class="flex flex-col items-center px-6 py-20 text-center">
              <h2 class="mt-4 mb-0 text-[18px] font-medium text-ink">加载待办失败</h2>
              <p class="mt-2 mb-0 max-w-[560px] text-[13px] leading-relaxed break-words text-ink-2">
                {error}
              </p>
              <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-2 rounded-btn bg-lime px-4 py-2.5 text-[14px] font-bold text-lime-on hover:brightness-95"
                  onClick={() => void load({ showSpinner: true })}
                >
                  <Refresh size={18} />
                  重试
                </button>
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-line px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  onClick={onOpenSettings}
                >
                  <Tune size={18} />
                  服务器设置
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 新建待办：回车保存，Shift+回车换行 */}
              <section class="rounded-composer bg-composer px-5 py-4 shadow-composer">
                <textarea
                  ref={inputRef}
                  value={text}
                  rows={1}
                  spellcheck={false}
                  placeholder="添加一条待办..."
                  enterkeyhint="done"
                  class="block max-h-[180px] min-h-[48px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[16.5px] leading-[1.5] text-ink outline-none"
                  onInput={(e) => {
                    setText(e.currentTarget.value)
                    autoGrow(e.currentTarget, 180)
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' || e.shiftKey) return
                    if (e.isComposing || e.keyCode === 229) return
                    e.preventDefault()
                    void addTodo()
                  }}
                />
                <div class="mt-3.5 flex items-center justify-between gap-2">
                  <span class="min-w-0 truncate text-[12px] text-ink-3">
                    新建到：{targetLabel}
                  </span>
                  <button
                    type="button"
                    disabled={saving || text.trim() === ''}
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-lime px-4 py-2.5 text-[14px] font-bold text-lime-on hover:brightness-95 disabled:cursor-default disabled:opacity-50"
                    onClick={() => void addTodo()}
                  >
                    {saving ? <Spinner size={14} width={2} /> : <Add size={16} />}
                    {saving ? '保存中' : '添加'}
                  </button>
                </div>
              </section>

              <div class="h-[18px]" />

              {todos.length === 0 ? (
                <div class="flex flex-col items-center py-[60px] text-center">
                  <Checklist size={72} class="text-lime/60" />
                  <p class="mt-4 mb-0 text-[17px] font-medium text-ink">{emptyText}</p>
                </div>
              ) : (
                <div class="flex flex-col gap-[18px]">
                  {todos.map((t, index) => (
                    <TodoRow
                      key={t.id}
                      todo={t}
                      index={index}
                      entering={entering.has(t.id)}
                      editing={editingId === t.id}
                      folderName={showFolderLabel ? nameOfFolder(t.folder_id) : null}
                      onStartEdit={() => setEditingId(t.id)}
                      onStopEdit={() => setEditingId(null)}
                      onToggleDone={() => runAction(() => updateTodo(t.id, { is_done: !t.is_done }))}
                      onUpdateContent={(content) =>
                        runAction(() => updateTodo(t.id, { content }), { rethrow: true })
                      }
                      onDelete={() => runAction(() => deleteTodo(t.id))}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 「全部 / 未分类」这种纯文字胶囊。 */
function FolderTab({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      class={cx(
        'inline-flex h-8 shrink-0 cursor-pointer items-center rounded-capsule px-3 text-[13.5px] whitespace-nowrap',
        selected
          ? 'bg-lime-select font-bold text-lime-on dark:text-white'
          : 'bg-black/[0.04] text-ink hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]',
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

/** 删除文件夹（会连它的待办一起删）—— 三次点击才执行，与卡片删除同一套手感。 */
function ArmedDeleteFolder({ name, onClick }: { name: string; onClick: () => void }) {
  const [arm, setArm] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handle() {
    if (arm >= 2) {
      window.clearTimeout(timer.current)
      timer.current = undefined
      setArm(0)
      onClick()
      return
    }
    setArm((a) => a + 1)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      setArm(0)
    }, 3000)
  }

  const title =
    arm >= 2 ? '再点一次将删除文件夹及其待办' : arm === 1 ? `再点一次确认删除「${name}」` : '删除文件夹'

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      style={
        arm === 0
          ? undefined
          : arm >= 2
            ? { color: 'var(--c-armed-danger)', background: 'var(--c-armed-danger-soft)' }
            : { color: 'var(--c-armed-warn)', background: 'var(--c-armed-warn-soft)' }
      }
      class="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-black/[0.08] dark:hover:bg-white/[0.12]"
      onClick={handle}
    >
      <Delete size={14} />
    </button>
  )
}

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
