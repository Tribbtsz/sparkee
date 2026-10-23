import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { Archive, Delete, PinFilled, PinOutline, Unarchive } from '../icons'
import type { Note } from '../types'
import { appendTag, autoGrow, bodyOf, caretToEnd, formatTime, removeTag, tagsOf } from '../util'
import { Spinner } from './Spinner'
import { TagRow } from './TagRow'

/** 需要「逐级武装」的两类破坏性操作。 */
type ArmKind = 'archive' | 'delete'
type BusyKind = ArmKind | 'pin'

interface Props {
  note: Note
  /** 是否编辑态。由父级统一控制，保证同一时间只有一张卡片能编辑。 */
  editing: boolean
  /** 是否播入场动画（只有"新出现"的卡片才为 true）。 */
  entering: boolean
  /** 在列表中的序号，用来把入场动画错开。 */
  index: number
  onStartEdit: () => void
  onStopEdit: () => void
  onTogglePin: () => Promise<void>
  onToggleArchive: () => Promise<void>
  onDelete: () => Promise<void>
  onUpdateContent: (content: string) => Promise<void>
  onTagTap: (tag: string) => void
}

/** 每一步武装状态的有效期：超时自动复位。 */
const ARM_TIMEOUT_MS = 3000
/** 相邻卡片的入场错开步长与最大级数：越靠后的卡片稍晚出现，最多错开这么多级。 */
const STAGGER_MS = 28
const MAX_STAGGER = 6

export function NoteCard(props: Props) {
  const { note, editing, entering, index } = props

  const [draft, setDraft] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const [arm, setArm] = useState<Record<ArmKind, number>>({ archive: 0, delete: 0 })
  const [busy, setBusy] = useState<Record<BusyKind, boolean>>({
    pin: false,
    archive: false,
    delete: false,
  })
  const armTimers = useRef<Record<ArmKind, number | undefined>>({
    archive: undefined,
    delete: undefined,
  })
  const editRef = useRef<HTMLTextAreaElement | null>(null)

  // 进入编辑态：用最新内容初始化、抢焦点、把光标放到末尾
  useEffect(() => {
    if (!editing) return
    setDraft(note.content)
    requestAnimationFrame(() => {
      const el = editRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      autoGrow(el, 320)
    })
    // 只依赖 editing：编辑过程中 note.content 变了也不能重置草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  // 非编辑态时与 props 保持同步（刷新后内容可能变了）
  useEffect(() => {
    if (!editing) setDraft(note.content)
  }, [note.content, editing])

  useEffect(
    () => () => {
      window.clearTimeout(armTimers.current.archive)
      window.clearTimeout(armTimers.current.delete)
    },
    [],
  )

  function resetArm(kind: ArmKind) {
    window.clearTimeout(armTimers.current[kind])
    armTimers.current[kind] = undefined
    setArm((a) => (a[kind] === 0 ? a : { ...a, [kind]: 0 }))
  }

  /** 点第 3 次才真正执行；每点一次重置 3 秒定时器，超时自动复位。 */
  function handleArmed(kind: ArmKind, action: () => void) {
    if (arm[kind] >= 2) {
      resetArm(kind)
      action()
      return
    }
    setArm((a) => ({ ...a, [kind]: a[kind] + 1 }))
    window.clearTimeout(armTimers.current[kind])
    armTimers.current[kind] = window.setTimeout(() => {
      armTimers.current[kind] = undefined
      setArm((a) => ({ ...a, [kind]: 0 }))
    }, ARM_TIMEOUT_MS)
  }

  /** 请求进行中：对应图标换成转圈，并临时屏蔽重复点击。 */
  async function runWithBusy(kind: BusyKind, action: () => Promise<void>) {
    if (busy[kind]) return
    setBusy((b) => ({ ...b, [kind]: true }))
    try {
      await action()
    } finally {
      setBusy((b) => ({ ...b, [kind]: false }))
    }
  }

  function armedTooltip(kind: ArmKind, base: string): string {
    if (arm[kind] >= 2) return `再点一次将${base}`
    if (arm[kind] === 1) return `再点一次确认${base}`
    return base
  }

  /** 武装态的内联样式：一级=黄、二级=红，并加一个同色淡底胶囊。 */
  function armStyle(kind: ArmKind) {
    if (arm[kind] === 0) return undefined
    return arm[kind] >= 2
      ? { color: 'var(--c-armed-danger)', background: 'var(--c-armed-danger-soft)' }
      : { color: 'var(--c-armed-warn)', background: 'var(--c-armed-warn-soft)' }
  }

  async function saveEdit() {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await props.onUpdateContent(text)
      props.onStopEdit()
    } catch {
      // 保存失败：保持编辑态，错误提示由上层统一 toast
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setDraft(note.content)
    props.onStopEdit()
  }

  /** 编辑态里标签跟着输入实时变化，所以用 draft 而不是 note.content。 */
  const displayText = editing ? draft : note.content
  const tags = tagsOf(displayText)
  const body = bodyOf(note.content)

  return (
    <article
      class={`${note.is_pinned ? 'bg-card-pinned' : 'bg-card'} rounded-card shadow-card ${
        entering ? 'card-enter' : ''
      }`}
      style={
        entering ? { animationDelay: `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms` } : undefined
      }
    >
      <div class="px-4 pt-3 pb-3.5">
        {/* ---- 信息行：置顶标记 + 时间 + 平铺的操作图标 ---- */}
        {/* 双击编辑只挂在下面的内容区，所以在这行连点操作图标不会误入编辑态 */}
        <div class="flex items-center gap-1.5">
          {note.is_pinned && <PinFilled size={14} class="shrink-0 text-lime-icon" />}
          <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-2">
            {formatTime(note.created_at)}
          </span>

          <div class="flex shrink-0 items-center gap-1">
            <CardAction
              title={note.is_pinned ? '取消置顶' : '置顶卡片'}
              busy={busy.pin}
              onClick={() => void runWithBusy('pin', props.onTogglePin)}
            >
              <PinOutline size={17} />
            </CardAction>

            <CardAction
              title={armedTooltip('archive', note.archived ? '移出归档' : '归档')}
              busy={busy.archive}
              style={armStyle('archive')}
              onClick={() =>
                handleArmed('archive', () => void runWithBusy('archive', props.onToggleArchive))
              }
            >
              {note.archived ? <Unarchive size={17} /> : <Archive size={17} />}
            </CardAction>

            <CardAction
              title={armedTooltip('delete', '删除')}
              busy={busy.delete}
              style={armStyle('delete')}
              onClick={() =>
                handleArmed('delete', () => void runWithBusy('delete', props.onDelete))
              }
            >
              <Delete size={17} />
            </CardAction>
          </div>
        </div>

        <div class="my-2.5 border-t border-line" />

        {/* ---- 内容区：双击才进编辑 ---- */}
        <div
          class="cursor-text"
          onDblClick={() => {
            if (!editing) props.onStartEdit()
          }}
        >
          {editing ? (
            <>
              <textarea
                ref={editRef}
                value={draft}
                rows={3}
                spellcheck={false}
                placeholder="修改内容，输入 #标签 自动分类..."
                class="block w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[16px] leading-[1.6] text-ink outline-none"
                onInput={(e) => {
                  setDraft(e.currentTarget.value)
                  autoGrow(e.currentTarget, 320)
                }}
              />
              <div class="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  class="cursor-pointer rounded-btn px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:bg-black/[0.06] disabled:opacity-50 dark:hover:bg-white/[0.08]"
                  onClick={cancelEdit}
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={saving}
                  class="inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-lime px-3.5 py-2 text-[13px] font-bold text-lime-on hover:brightness-95 disabled:opacity-60"
                  onClick={() => void saveEdit()}
                >
                  {saving && <Spinner size={12} width={2} />}
                  {saving ? '保存中' : '完成'}
                </button>
              </div>
            </>
          ) : (
            body && (
              <p class="m-0 text-[16px] leading-[1.6] tracking-[0.15px] break-words whitespace-pre-wrap text-ink">
                {body}
              </p>
            )
          )}

          {/* ---- 标签行：最下方，与正文之间一条细分割线 ---- */}
          {(tags.length > 0 || editing) && (
            <>
              <div class="my-2.5 border-t border-line" />
              <TagRow
                tags={tags}
                editing={editing}
                onTagTap={props.onTagTap}
                onRemove={(tag) => {
                  setDraft((d) => removeTag(d, tag))
                  caretToEnd(editRef.current)
                }}
                onAdd={(raw) => {
                  setDraft((d) => appendTag(d, raw))
                  caretToEnd(editRef.current)
                }}
              />
            </>
          )}
        </div>
      </div>
    </article>
  )
}

interface CardActionProps {
  title: string
  busy: boolean
  onClick: () => void
  style?: Record<string, string>
  children: ComponentChildren
}

/**
 * 卡片顶部平铺的一个操作图标。
 * 默认用普通次级文字色（不抢注意力）；武装时由 style 换成黄/红 + 淡底胶囊。
 */
function CardAction({ title, busy, onClick, style, children }: CardActionProps) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={busy}
      style={style}
      class="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-ink-2 transition-colors hover:bg-black/[0.06] disabled:cursor-default dark:hover:bg-white/[0.08]"
      onClick={busy ? undefined : onClick}
    >
      {busy ? <Spinner size={15} width={2} /> : children}
    </button>
  )
}
