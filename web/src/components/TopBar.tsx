import type { ComponentChildren } from 'preact'
import { useRef } from 'preact/hooks'
import { CalendarMonth, Close, Menu, Search } from '../icons'
import { Spinner } from './Spinner'

interface Props {
  query: string
  searchBusy: boolean
  selectedDate: string | null
  onQueryChange: (value: string) => void
  onSubmitSearch: () => void
  onClearQuery: () => void
  onPickDate: (date: string | null) => void
  onOpenSidebar: () => void
}

/** 顶栏：搜索框 + 日期筛选（窄屏另有汉堡菜单）。 */
export function TopBar({
  query,
  searchBusy,
  selectedDate,
  onQueryChange,
  onSubmitSearch,
  onClearQuery,
  onPickDate,
  onOpenSidebar,
}: Props) {
  const dateRef = useRef<HTMLInputElement | null>(null)

  function toggleDate() {
    if (selectedDate) {
      onPickDate(null)
      return
    }
    const el = dateRef.current
    if (!el) return
    // showPicker() 需要用户手势，这个点击满足；个别浏览器不支持就退回 click()
    try {
      el.showPicker()
    } catch {
      el.click()
    }
  }

  return (
    <header class="flex h-16 shrink-0 items-center gap-1 bg-scaffold px-3 md:gap-2 md:px-7">
      <button
        type="button"
        title="菜单"
        aria-label="打开侧栏"
        class="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-black/[0.06] md:hidden dark:hover:bg-white/[0.08]"
        onClick={onOpenSidebar}
      >
        <Menu size={24} />
      </button>

      {/* ---- 搜索框 ---- */}
      <div class="relative flex h-[46px] min-w-0 max-w-[480px] flex-1 items-center rounded-full bg-surface-2 pr-1.5 pl-4">
        <span class="mr-2.5 flex shrink-0 items-center text-ink-2">
          {searchBusy ? <Spinner size={18} width={2.2} /> : <Search size={22} />}
        </span>
        <input
          type="text"
          value={query}
          placeholder="搜索闪念内容..."
          enterkeyhint="search"
          class="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none"
          onInput={(e) => onQueryChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.isComposing || e.keyCode === 229) return
              e.preventDefault()
              onSubmitSearch()
            }
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            title="清除搜索"
            aria-label="清除搜索"
            class="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            onClick={onClearQuery}
          >
            <Close size={18} />
          </button>
        )}
      </div>

      {/* 宽屏才要这段占位把右侧图标顶到最右；窄屏必须隐藏，
          否则它会和搜索框抢 flex-1，把搜索框挤窄到文字显示不全。 */}
      <div class="hidden flex-1 md:block" />

      {/* ---- 日期筛选 ---- */}
      <IconButton
        title={selectedDate === null ? '按日期筛选' : `当前筛选: ${selectedDate} · 点击清除`}
        onClick={toggleDate}
      >
        <span class={selectedDate ? 'text-lime' : undefined}>
          <CalendarMonth size={24} />
        </span>
      </IconButton>

      <span class="hidden w-1 md:block" />

      <input
        ref={dateRef}
        type="date"
        aria-hidden="true"
        tabIndex={-1}
        value={selectedDate ?? ''}
        min="2020-01-01"
        max="2035-12-31"
        class="pointer-events-none absolute h-px w-px opacity-0"
        onChange={(e) => onPickDate(e.currentTarget.value || null)}
      />
    </header>
  )
}

function IconButton({
  title,
  onClick,
  class: cls,
  children,
}: {
  title: string
  onClick: () => void
  class?: string
  children: ComponentChildren
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      class={`grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.08] ${cls ?? ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
