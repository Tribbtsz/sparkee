import type { JSX, RefObject } from 'preact'
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'
import { ChevronLeft, ChevronRight } from '../icons'
import { cx, todayStr } from '../util'

/** 可选范围下限：更早的日期没有筛选意义。 */
const MIN_KEY = '2020-01-01'

/** 表头星期名，周日开头（与 JS 的 getDay 对齐）。 */
const WEEK_HEADS = ['日', '一', '二', '三', '四', '五', '六']

/** 年月面板里的月份名。 */
const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)

interface Props {
  /** 当前筛选日期 YYYY-MM-DD；null 表示没有日期筛选。 */
  value: string | null
  /** 触发浮层的按钮，浮层贴着它定位。 */
  anchorRef: RefObject<HTMLElement | null>
  /** 选中某天：立即生效并关闭浮层。 */
  onPick: (date: string) => void
  /** 清除日期筛选：浮层保持打开，方便接着选。 */
  onClear: () => void
  onClose: () => void
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Date → YYYY-MM-DD（本地时区，与后端 date 筛选同一套语义）。 */
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** YYYY-MM-DD → Date；格式不对返回 null。 */
function parseKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (m === null) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * 日期筛选浮层：自己画的日历，替掉 <input type="date"> 的原生选择器 ——
 * 原生弹窗长什么样全看系统和浏览器，跟这套界面完全不搭。
 *
 * 交互约定：
 *  - 点某天立即生效并关闭；点已选中的那天只是关闭（清除走底部按钮）；
 *  - 「今天 / 昨天」两个快捷胶囊；
 *  - 点标题在「日视图 / 年月视图」之间切换，翻不用一年点十二次；
 *  - 方向键在日视图里移动焦点（Tab 只进一次，靠方向键在里面走），回车选中，Esc 关闭；
 *  - 未来的日期不可选 —— 闪念不可能来自未来。
 */
export function DatePicker({ value, anchorRef, onPick, onClear, onClose }: Props) {
  const today = todayStr()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  // 打开时把视图停在被选中的日期上（没选过就停今天）
  const [cursor, setCursor] = useState(() => {
    const d = parseKey(value ?? '') ?? new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  /** 日视图 / 年月视图。 */
  const [mode, setMode] = useState<'days' | 'months'>('days')
  /** 键盘焦点所在日期（漫游 tabindex 用）。 */
  const [focusKey, setFocusKey] = useState(() => value ?? today)
  /** 浮层坐标；量完之前先藏起来，避免在错误位置闪一下。 */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const min = parseKey(MIN_KEY)
  const maxY = new Date().getFullYear()
  const maxM = new Date().getMonth()
  const atMin = min !== null && cursor.y === min.getFullYear() && cursor.m === min.getMonth()
  const atMax = cursor.y === maxY && cursor.m === maxM

  // 贴着自己的触发按钮定位：默认展开在下方，下方不够且上方更宽裕就翻上去。
  // 监听 scroll（捕获阶段）是因为列表滚动时浮层得跟着按钮走。
  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current
      const panel = panelRef.current
      if (anchor === null || panel === null) return
      const r = anchor.getBoundingClientRect()
      const gap = 8
      const edge = 8
      const w = panel.offsetWidth
      const h = panel.offsetHeight
      // 右对齐按钮；窄屏放不下就往左挪，两侧都留出 edge
      const left = Math.min(
        Math.max(r.right - w, edge),
        Math.max(edge, window.innerWidth - w - edge),
      )
      const below = r.bottom + gap
      const above = r.top - gap - h
      const top = below + h <= window.innerHeight - edge || above < edge ? below : above
      // 滚动时这个函数每帧都跑；坐标没变就别触发重渲染
      setPos((prev) =>
        prev !== null && prev.top === top && prev.left === left ? prev : { top, left },
      )
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchorRef, cursor.y, cursor.m, mode])

  // Esc 关闭（和设置弹窗保持一致）
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 打开时把焦点收进浮层，Esc / Tab 的行为才符合预期
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  // 方向键移动焦点：只有焦点本来就在日历里时才跟随，鼠标打开不抢焦点
  useEffect(() => {
    const grid = gridRef.current
    if (grid === null || !grid.contains(document.activeElement)) return
    grid.querySelector<HTMLButtonElement>(`[data-day="${focusKey}"]`)?.focus()
  }, [focusKey, cursor])

  /** 翻月；delta 传 ±12 就是翻年。到边界就夹住，按钮同时置灰。 */
  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1)
      if (min !== null && d < new Date(min.getFullYear(), min.getMonth(), 1)) {
        return { y: min.getFullYear(), m: min.getMonth() }
      }
      if (d > new Date(maxY, maxM, 1)) return { y: maxY, m: maxM }
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function onGridKeyDown(e: JSX.TargetedKeyboardEvent<HTMLDivElement>) {
    const step =
      e.key === 'ArrowLeft'
        ? -1
        : e.key === 'ArrowRight'
          ? 1
          : e.key === 'ArrowUp'
            ? -7
            : e.key === 'ArrowDown'
              ? 7
              : 0
    if (step === 0) return
    e.preventDefault()
    const d = parseKey(focusKey) ?? new Date()
    d.setDate(d.getDate() + step)
    setFocusKey(keyOf(d))
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
  }

  // 固定 6 行：切换月份时高度不变，浮层不会忽大忽小
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const lead = new Date(cursor.y, cursor.m, 1).getDay()
  const cells: Array<string | null> = []
  for (let i = 0; i < lead; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(keyOf(new Date(cursor.y, cursor.m, d)))
  while (cells.length < 42) cells.push(null)

  function outOfRange(key: string): boolean {
    return key < MIN_KEY || key > today
  }

  function monthOutOfRange(y: number, m: number): boolean {
    return keyOf(new Date(y, m + 1, 0)) < MIN_KEY || keyOf(new Date(y, m, 1)) > today
  }

  function dayLabel(key: string): string {
    const d = parseKey(key)
    if (d === null) return key
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK_HEADS[d.getDay()]}`
  }

  const navBtn =
    'grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-black/[0.06] disabled:cursor-default disabled:text-ink-3 disabled:hover:bg-transparent dark:hover:bg-white/[0.08] dark:disabled:hover:bg-transparent'

  return (
    <>
      {/* 透明背板吃掉浮层外的点击，比在 document 上监听更稳（不会误伤内部点击） */}
      <div class="fixed inset-0 z-40" onPointerDown={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="选择日期"
        tabIndex={-1}
        class="pop-in fixed z-50 w-[300px] rounded-card bg-surface p-3 shadow-dialog outline-none"
        style={pos === null ? { visibility: 'hidden' } : { top: pos.top, left: pos.left }}
      >
        {/* ---- 标题栏：翻页 + 年月（点年月切换视图） ---- */}
        <div class="flex items-center gap-1">
          <button
            type="button"
            title="上一步"
            aria-label="上一步"
            disabled={atMin}
            class={navBtn}
            onClick={() => shiftMonth(mode === 'days' ? -1 : -12)}
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            class="flex h-9 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 rounded-capsule text-[14px] font-bold text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            aria-expanded={mode === 'months'}
            onClick={() => setMode((v) => (v === 'days' ? 'months' : 'days'))}
          >
            {mode === 'days' ? `${cursor.y}年${cursor.m + 1}月` : `${cursor.y}年`}
            <ChevronRight
              size={16}
              class={cx('transition-transform', mode === 'months' && 'rotate-90')}
            />
          </button>

          <button
            type="button"
            title="下一步"
            aria-label="下一步"
            disabled={atMax}
            class={navBtn}
            onClick={() => shiftMonth(mode === 'days' ? 1 : 12)}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {mode === 'days' ? (
          <>
            {/* ---- 快捷胶囊 ---- */}
            <div class="mt-2 flex items-center gap-1.5">
              <QuickChip label="今天" onClick={() => onPick(today)} />
              <QuickChip
                label="昨天"
                onClick={() => {
                  const d = new Date()
                  d.setDate(d.getDate() - 1)
                  onPick(keyOf(d))
                }}
              />
            </div>

            {/* ---- 日历网格 ---- */}
            <div ref={gridRef} class="mt-1.5 grid grid-cols-7 gap-y-0.5" onKeyDown={onGridKeyDown}>
              {WEEK_HEADS.map((w) => (
                <span
                  key={w}
                  class="grid h-8 place-items-center text-[12px] font-medium text-ink-3"
                >
                  {w}
                </span>
              ))}

              {cells.map((key, i) =>
                key === null ? (
                  <span key={`blank-${i}`} />
                ) : (
                  <button
                    key={key}
                    type="button"
                    data-day={key}
                    disabled={outOfRange(key)}
                    aria-label={dayLabel(key)}
                    aria-pressed={key === value}
                    tabIndex={key === focusKey ? 0 : -1}
                    class={cx(
                      'grid h-9 w-9 cursor-pointer place-items-center justify-self-center rounded-full text-[13.5px]',
                      key === value
                        ? 'bg-lime font-bold text-lime-on'
                        : key === today
                          ? 'font-bold text-lime-quick hover:bg-lime-soft dark:text-lime'
                          : 'text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
                      outOfRange(key) &&
                        'cursor-default text-ink-3 hover:bg-transparent dark:hover:bg-transparent',
                    )}
                    onClick={() => (key === value ? onClose() : onPick(key))}
                  >
                    {Number(key.slice(8))}
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          /* ---- 年月面板 ---- */
          <div class="mt-2 grid grid-cols-3 gap-1.5">
            {MONTHS.map((label, i) => {
              const active = value !== null && value.startsWith(`${cursor.y}-${pad2(i + 1)}-`)
              const isNow = cursor.y === maxY && i === maxM
              return (
                <button
                  key={label}
                  type="button"
                  disabled={monthOutOfRange(cursor.y, i)}
                  aria-pressed={active}
                  class={cx(
                    'h-9 cursor-pointer rounded-capsule text-[13px]',
                    active
                      ? 'bg-lime font-bold text-lime-on'
                      : isNow
                        ? 'font-bold text-lime-quick dark:text-lime'
                        : 'font-medium text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.08]',
                    monthOutOfRange(cursor.y, i) &&
                      'cursor-default text-ink-3 hover:bg-transparent dark:hover:bg-transparent',
                  )}
                  onClick={() => {
                    setCursor({ y: cursor.y, m: i })
                    setMode('days')
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* ---- 底部：当前选择 + 清除 / 完成 ---- */}
        <div class="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
          <span class="min-w-0 flex-1 truncate text-[12px] text-ink-2">
            {value === null ? '未选择日期' : `已选 ${value}`}
          </span>
          {value !== null && (
            <button
              type="button"
              class="shrink-0 cursor-pointer rounded-capsule px-2.5 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/[0.08] dark:hover:text-ink"
              onClick={onClear}
            >
              清除
            </button>
          )}
          <button
            type="button"
            class="shrink-0 cursor-pointer rounded-capsule bg-lime px-3 py-1.5 text-[13px] font-bold text-lime-on hover:brightness-95"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </>
  )
}

/** 快捷胶囊（今天 / 昨天）。 */
function QuickChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class="h-7 cursor-pointer rounded-capsule bg-surface-2 px-2.5 text-[12.5px] font-medium text-ink-2 hover:text-ink"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
