import type { ComponentChildren } from 'preact'
import { Bolt, Checklist, FlashOn, Tag, Today, Tune, Archive } from '../icons'
import type { ThemeMode } from '../theme'
import { THEME_OPTIONS } from '../theme'
import type { Stats, TagStat } from '../types'
import { cx } from '../util'

export type NavKind = 'today' | 'all' | 'archive'

interface Props {
  stats: Stats
  tags: TagStat[]
  /** 当前主视图：闪念流还是待办本。 */
  view: 'notes' | 'todos'
  /** 未完成待办数（「待办本」徽标）。 */
  todoCount: number
  archived: boolean
  selectedTag: string | null
  selectedDate: string | null
  today: string
  theme: ThemeMode
  onNav: (kind: NavKind) => void
  onOpenTodos: () => void
  onSelectTag: (tag: string | null) => void
  onThemeChange: (mode: ThemeMode) => void
  onOpenSettings: () => void
}

/** 左侧固定侧栏（窄屏时放进抽屉里的也是同一个组件）。 */
export function Sidebar({
  stats,
  tags,
  view,
  todoCount,
  archived,
  selectedTag,
  selectedDate,
  today,
  theme,
  onNav,
  onOpenTodos,
  onSelectTag,
  onThemeChange,
  onOpenSettings,
}: Props) {
  const notesView = view === 'notes'
  const todaySelected = notesView && !archived && selectedDate === today
  const allSelected = notesView && !archived && selectedTag === null && selectedDate === null
  const archiveSelected = notesView && archived

  return (
    <div class="flex h-full w-full flex-col bg-sidebar">
      {/* ---- 品牌区 ---- */}
      <div class="flex items-center gap-3 px-[22px] pt-[18px] pb-5">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-btn bg-brand-bg text-brand-fg">
          <Bolt size={24} />
        </span>
        <span class="text-[18px] font-extrabold tracking-[-0.3px] text-ink">Sparkee</span>
      </div>
      <div class="mx-[18px] border-t border-line" />

      {/* ---- 核心导航 ---- */}
      <nav class="flex flex-col gap-1 px-3 py-4">
        <NavItem
          icon={<Today size={21} />}
          title="今日闪念"
          selected={todaySelected}
          onClick={() => onNav('today')}
        />
        <NavItem
          icon={<FlashOn size={21} />}
          title="全部闪念"
          count={stats.active}
          selected={allSelected}
          onClick={() => onNav('all')}
        />
        <NavItem
          icon={<Archive size={21} />}
          title="归档盒"
          count={stats.archived}
          selected={archiveSelected}
          onClick={() => onNav('archive')}
        />
        <div class="my-1.5 border-t border-line" />
        <NavItem
          icon={<Checklist size={21} />}
          title="待办本"
          count={todoCount}
          selected={view === 'todos'}
          onClick={onOpenTodos}
        />
      </nav>

      {/* ---- ALL TAGS 标题 ---- */}
      <div class="flex items-center justify-between px-[22px] py-2.5">
        <span class="text-[12px] font-extrabold tracking-[1.2px] text-ink-3">ALL TAGS</span>
        {selectedTag !== null && (
          <button
            type="button"
            class="cursor-pointer rounded px-1 py-0.5 text-[12px] font-bold text-lime-quick dark:text-lime"
            onClick={() => onSelectTag(null)}
          >
            清除
          </button>
        )}
      </div>

      {/* ---- 标签列表 ---- */}
      <div class="min-h-0 flex-1 overflow-y-auto px-3">
        {tags.length === 0 ? (
          <div class="flex h-full items-center justify-center px-6">
            <p class="m-0 text-center text-[13px] leading-[1.5] whitespace-pre-line text-ink-3">
              {'暂无标签\n在卡片中输入 #tag 即可归类'}
            </p>
          </div>
        ) : (
          <div class="flex flex-col gap-1 pb-2">
            {tags.map((t) => {
              const selected = selectedTag === t.name
              return (
                <button
                  key={t.name}
                  type="button"
                  title={selected ? `取消筛选 #${t.name}` : `筛选 #${t.name}`}
                  class={cx(
                    'flex h-9 w-full cursor-pointer items-center gap-3 rounded-capsule px-3 text-left',
                    selected ? 'bg-tag-select' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
                  )}
                  onClick={() => onSelectTag(selected ? null : t.name)}
                >
                  <Tag size={18} class={cx('shrink-0', selected ? 'text-lime' : 'text-ink-2')} />
                  <span
                    class={cx(
                      'min-w-0 flex-1 truncate text-[14.5px] text-ink',
                      selected ? 'font-bold' : 'font-medium',
                    )}
                  >
                    {t.name}
                  </span>
                  <span class="shrink-0 text-[12px] text-ink-3">{t.count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- 底部：主题三档切换 + 服务器配置（都无边框） ---- */}
      <div class="flex flex-col gap-2.5 px-4 pt-3 pb-4">
        <ThemeTabs value={theme} onChange={onThemeChange} />

        <button
          type="button"
          class="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-capsule bg-black/[0.03] text-[13.5px] font-medium text-ink hover:bg-black/[0.06] dark:bg-white/[0.05] dark:hover:bg-white/[0.09]"
          onClick={onOpenSettings}
        >
          <Tune size={18} />
          服务器配置
        </button>
      </div>
    </div>
  )
}

/** 主题三档切换：跟随系统 / 明 / 暗（分段控件，选中档柠黄底）。 */
function ThemeTabs({ value, onChange }: { value: ThemeMode; onChange: (m: ThemeMode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="主题"
      class="flex items-center gap-0.5 rounded-capsule bg-black/[0.055] p-[3px] dark:bg-white/[0.09]"
    >
      {THEME_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={option.title}
            class={cx(
              'h-8 min-w-0 flex-1 cursor-pointer truncate rounded-[7px] text-[12.5px] whitespace-nowrap',
              active
                ? 'bg-lime font-bold text-lime-on'
                : 'font-medium text-ink-2 hover:text-ink',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface NavItemProps {
  icon: ComponentChildren
  title: string
  count?: number
  selected: boolean
  onClick: () => void
}

function NavItem({ icon, title, count, selected, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      class={cx(
        'flex h-11 w-full cursor-pointer items-center gap-3 rounded-btn px-3 text-left',
        selected ? 'bg-lime-select' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06]',
      )}
      onClick={onClick}
    >
      <span class={cx('shrink-0', selected ? 'text-lime-fg' : 'text-ink')}>{icon}</span>
      <span
        class={cx(
          'min-w-0 flex-1 truncate text-[15px]',
          selected ? 'font-bold text-lime-on dark:text-white' : 'font-medium text-ink',
        )}
      >
        {title}
      </span>
      {count !== undefined && (
        <span class="shrink-0 text-[13px] font-medium text-ink-2">{count}</span>
      )}
    </button>
  )
}
