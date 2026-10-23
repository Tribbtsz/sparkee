import { useEffect, useRef, useState } from 'preact/hooks'
import { CheckCircle, Delete, Folder, RadioButtonUnchecked } from '../icons'
import type { Todo } from '../types'
import { autoGrow, cx, formatDateTime, formatTime } from '../util'
import { Spinner } from './Spinner'

interface Props {
  todo: Todo
  /** 「全部」视图里显示所属文件夹名（其余视图传 null，避免和顶部选择重复）。 */
  folderName: string | null
  /** 是否编辑态，由父级统一控制（同一时间只有一条能编辑）。 */
  editing: boolean
  /** 是否播入场动画。 */
  entering: boolean
  index: number
  onStartEdit: () => void
  onStopEdit: () => void
  onToggleDone: () => Promise<void>
  onUpdateContent: (content: string) => Promise<void>
  onDelete: () => Promise<void>
}

/** 删除按钮的「逐级武装」超时：与 NoteCard 一致。 */
const ARM_TIMEOUT_MS = 3000
const STAGGER_MS = 24
const MAX_STAGGER = 6

/**
 * 一条待办。左侧勾选框（完成/取消），中间内容（双击编辑），
 * 底部一行「创建/修改时间」，右侧删除（三次点击才真正执行）。
 */
export function TodoRow(props: Props) {
  const { todo, editing, entering, index } = props

  const [draft, setDraft] = useState(todo.content)
  const [saving, setSaving] = useState(false)
  const [doneBusy, setDoneBusy] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [arm, setArm] = useState(0)
  const armTimer = useRef<number | undefined>(undefined)
  const editRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!editing) return
    setDraft(todo.content)
    requestAnimationFrame(() => {
      const el = editRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
      autoGrow(el, 320)
    })
    // 只依赖 editing：编辑过程中 todo.content 变了也不能重置草稿
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(todo.content)
  }, [todo.content, editing])

  useEffect(() => () => window.clearTimeout(armTimer.current), [])

  function resetArm() {
    window.clearTimeout(armTimer.current)
    armTimer.current = undefined
    setArm(0)
  }

  /** 点第 3 次才真正删除；每点一次重置 3 秒定时器，超时自动复位。 */
  function handleDelete() {
    if (arm >= 2) {
      resetArm()
      void runDelete()
      return
    }
    setArm((a) => a + 1)
    window.clearTimeout(armTimer.current)
    armTimer.current = window.setTimeout(() => {
      armTimer.current = undefined
      setArm(0)
    }, ARM_TIMEOUT_MS)
  }

  async function runDelete() {
    if (deleteBusy) return
    setDeleteBusy(true)
    try {
      await props.onDelete()
    } finally {
      setDeleteBusy(false)
    }
  }

  async function toggleDone() {
    if (doneBusy) return
    setDoneBusy(true)
    try {
      await props.onToggleDone()
    } finally {
      setDoneBusy(false)
    }
  }

  async function saveEdit() {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await props.onUpdateContent(text)
      props.onStopEdit()
    } catch {
      // 保存失败：保持编辑态，错误提示由上层 toast
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setDraft(todo.content)
    props.onStopEdit()
  }

  const deleteTitle = arm >= 2 ? '再点一次将删除' : arm === 1 ? '再点一次确认删除' : '删除待办'
  const armStyle =
    arm === 0
      ? undefined
      : arm >= 2
        ? { color: 'var(--c-armed-danger)', background: 'var(--c-armed-danger-soft)' }
        : { color: 'var(--c-armed-warn)', background: 'var(--c-armed-warn-soft)' }

  return (
    <article
      class={cx('rounded-card bg-card px-4 pt-3 pb-3.5 shadow-card', entering && 'card-enter')}
      style={
        entering ? { animationDelay: `${Math.min(index, MAX_STAGGER) * STAGGER_MS}ms` } : undefined
      }
    >
      <div class="flex items-start gap-3">
        {/* ---- 勾选框 ---- */}
        <button
          type="button"
          title={todo.is_done ? '标记为未完成' : '标记为已完成'}
          aria-label={todo.is_done ? '标记为未完成' : '标记为已完成'}
          disabled={doneBusy}
          class="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full disabled:cursor-default"
          onClick={() => void toggleDone()}
        >
          {doneBusy ? (
            <Spinner size={20} width={2} />
          ) : todo.is_done ? (
            <CheckCircle size={22} class="text-lime" />
          ) : (
            <RadioButtonUnchecked size={22} class="text-ink-3 hover:text-ink-2" />
          )}
        </button>

        {/* ---- 内容 + 时间 ---- */}
        <div class="min-w-0 flex-1">
          {editing ? (
            <>
              <textarea
                ref={editRef}
                value={draft}
                rows={2}
                spellcheck={false}
                placeholder="修改待办内容..."
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
            <p
              class={cx(
                'm-0 cursor-text text-[16px] leading-[1.6] tracking-[0.15px] break-words whitespace-pre-wrap',
                todo.is_done ? 'text-ink-3 line-through' : 'text-ink',
              )}
              onDblClick={() => {
                if (!editing) props.onStartEdit()
              }}
            >
              {todo.content}
            </p>
          )}

          <div class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-ink-2">
            {props.folderName !== null && (
              <span class="inline-flex items-center gap-1 rounded-chip bg-black/[0.05] px-1.5 py-0.5 dark:bg-white/10">
                <Folder size={12} />
                {props.folderName}
              </span>
            )}
            <span title={`创建于 ${formatDateTime(todo.created_at)}`}>
              创建 {formatTime(todo.created_at)}
            </span>
            <span aria-hidden="true">·</span>
            <span title={`修改于 ${formatDateTime(todo.updated_at)}`}>
              修改 {formatTime(todo.updated_at)}
            </span>
          </div>
        </div>

        {/* ---- 删除 ---- */}
        <button
          type="button"
          title={deleteTitle}
          aria-label={deleteTitle}
          disabled={deleteBusy}
          style={armStyle}
          class="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md text-ink-2 transition-colors hover:bg-black/[0.06] disabled:cursor-default dark:hover:bg-white/[0.08]"
          onClick={handleDelete}
        >
          {deleteBusy ? <Spinner size={16} width={2} /> : <Delete size={18} />}
        </button>
      </div>
    </article>
  )
}
