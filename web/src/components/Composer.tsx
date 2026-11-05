import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { loadNoteDraft, saveNoteDraft } from '../draft'
import { FlashOn, Schedule, Today } from '../icons'
import { autoGrow, insertAtCursor, nowHm, stripSubmitted, todayStr } from '../util'
import { Spinner } from './Spinner'

interface Props {
  /**
   * 保存失败时抛错，输入框会保留内容方便重试。
   * 返回 false 表示这次内容没有被当前服务器接收（例如保存期间切了服务器），同样保留草稿。
   */
  onSave: (content: string) => Promise<boolean>
}

/**
 * 顶部输入卡：始终展开、无边框（靠底色 + 阴影与页面区分）。
 * Enter 直接发送；Shift+Enter / Ctrl+Enter（Mac 上 Cmd+Enter）插入换行。
 */
export function Composer({ onSave }: Props) {
  const [text, setText] = useState(loadNoteDraft)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement | null>(null)
  /** 同步挡重复提交：连续按 Enter 时 state 还没渲染，光靠 saving 会漏。 */
  const savingRef = useRef(false)

  useEffect(() => {
    saveNoteDraft(text)
  }, [text])

  // 恢复的草稿可能不止两行，挂载后先按内容撑开
  useEffect(() => {
    autoGrow(ref.current, 180)
  }, [])

  /** 在光标处插入文本，并把光标移到插入内容之后。 */
  function insert(toInsert: string) {
    const el = ref.current
    const { text: next, caret } = insertAtCursor(el, text, toInsert)
    setText(next)
    requestAnimationFrame(() => {
      const e = ref.current
      if (!e) return
      e.focus()
      e.setSelectionRange(caret, caret)
      autoGrow(e, 180)
    })
  }

  async function submit() {
    const submitted = text
    const content = submitted.trim()
    if (!content || savingRef.current) return
    const hadFocus = document.activeElement === ref.current
    savingRef.current = true
    setSaving(true)
    try {
      const consumed = await onSave(content)
      if (!consumed) return
      // 保存期间可能又写了一段：只拿掉已提交的部分，新输入原样保留。
      setText((current) => stripSubmitted(current, submitted))
      requestAnimationFrame(() => {
        const el = ref.current
        if (!el) return
        autoGrow(el, 180)
        // 连续记录：不收起键盘、不丢焦点；用户已点到别处就别抢回来。
        if (hadFocus) el.focus()
      })
    } catch {
      // 保留已输入内容，错误提示由上层统一 toast
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return (
    <section class="rounded-composer bg-composer px-5 py-4 shadow-composer">
      <textarea
        ref={ref}
        value={text}
        rows={2}
        spellcheck={false}
        enterkeyhint="send"
        placeholder="写下这一刻的想法，输入 #标签 即可智能归类..."
        class="block max-h-[180px] min-h-[48px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[16.5px] leading-[1.5] text-ink outline-none"
        onInput={(e) => {
          setText(e.currentTarget.value)
          autoGrow(e.currentTarget, 180)
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          // 中文输入法选词时的 Enter 不能当成发送/换行。
          if (e.isComposing || e.keyCode === 229) return
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.preventDefault()
            insert('\n')
            return
          }
          e.preventDefault()
          void submit()
        }}
      />

      <div class="mt-3.5 flex flex-wrap items-center justify-between gap-y-2.5">
        <div class="flex flex-wrap items-center gap-2">
          <QuickChip
            icon={<Today size={13} />}
            label="今日"
            onClick={() => insert(`#${todayStr()} `)}
          />
          <QuickChip
            icon={<Schedule size={13} />}
            label="此刻"
            onClick={() => insert(`${nowHm()} `)}
          />
          <PlainChip label="#灵感" onClick={() => insert('#灵感 ')} />
          <PlainChip label="#随记" onClick={() => insert('#随记 ')} />
        </div>

        <button
          type="button"
          disabled={saving}
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-btn bg-lime px-4 py-2.5 text-[14px] font-bold text-lime-on hover:brightness-95 disabled:cursor-default disabled:opacity-60 max-[480px]:w-full max-[480px]:justify-center"
          onClick={() => void submit()}
        >
          {saving ? <Spinner size={14} width={2} /> : <FlashOn size={16} />}
          {saving ? '保存中' : '记录'}
        </button>
      </div>
    </section>
  )
}

/** 柠黄底的快捷胶囊（今日 / 此刻）。 */
function QuickChip({
  icon,
  label,
  onClick,
}: {
  icon: ComponentChildren
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded-chip bg-lime-soft px-2 py-1 text-[12.5px] font-semibold text-lime-quick"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

/** 中性底的小胶囊（#灵感 / #随记）。 */
function PlainChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class="cursor-pointer rounded-chip bg-black/[0.05] px-2 py-1 text-[12.5px] font-medium text-ink hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/[0.14]"
      onClick={onClick}
    >
      {label}
    </button>
  )
}
