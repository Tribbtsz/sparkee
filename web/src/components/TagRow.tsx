import { useRef, useState } from 'preact/hooks'
import { Add, Close, Tag } from '../icons'

interface Props {
  tags: string[]
  /** 编辑态：标签变成可删的胶囊，行尾多一个「+ 添加标签」。 */
  editing: boolean
  onTagTap: (tag: string) => void
  onRemove: (tag: string) => void
  onAdd: (raw: string) => void
}

/**
 * 卡片最下方的标签行。
 *
 * 展示态：tag 图标 + 标签名（不带 # 前缀），点击即筛选；连点两次吞掉事件，
 *         免得手快点两下就误进编辑态。
 * 编辑态：每枚标签带 ×（点了会同步删掉正文里的 #标签）；
 *         行尾的「+ 添加标签」会就地变成输入框，回车把 #标签 追加到正文末尾。
 */
export function TagRow({ tags, editing, onTagTap, onRemove, onAdd }: Props) {
  return (
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {editing ? (
        <>
          {tags.map((tag) => (
            <EditableTag key={tag} tag={tag} onRemove={() => onRemove(tag)} />
          ))}
          <AddTag onAdd={onAdd} />
        </>
      ) : (
        tags.map((tag) => (
          <button
            key={tag}
            type="button"
            title={`筛选标签 #${tag}`}
            class="inline-flex cursor-pointer items-center gap-[3px] rounded-chip px-0.5 py-px text-tag hover:underline"
            onClick={() => onTagTap(tag)}
            onDblClick={(e) => e.stopPropagation()}
          >
            <Tag size={12} />
            <span class="text-[11.5px] leading-none font-normal">{tag}</span>
          </button>
        ))
      )}
    </div>
  )
}

function EditableTag({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  return (
    <span class="inline-flex items-center gap-[3px] rounded-chip bg-black/[0.04] py-0.5 pr-0.5 pl-1.5 text-tag dark:bg-white/10">
      <Tag size={12} />
      <span class="text-[11.5px] leading-none font-normal">{tag}</span>
      <button
        type="button"
        title={`移除标签 ${tag}`}
        aria-label={`移除标签 ${tag}`}
        class="grid h-4 w-4 cursor-pointer place-items-center rounded text-ink-2 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
        onClick={onRemove}
      >
        <Close size={12} />
      </button>
    </span>
  )
}

function AddTag({ onAdd }: { onAdd: (raw: string) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  function submit() {
    if (text.trim()) onAdd(text)
    setText('')
    setOpen(false)
  }

  function cancel() {
    setText('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        title="添加标签"
        class="inline-flex cursor-pointer items-center gap-0.5 rounded-chip px-1 py-0.5 text-tag hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        <Add size={13} />
        <span class="text-[11.5px] leading-none font-normal">添加标签</span>
      </button>
    )
  }

  return (
    <span class="w-[110px] rounded-chip bg-black/[0.04] px-1.5 dark:bg-white/10">
      <input
        ref={inputRef}
        value={text}
        placeholder="标签名"
        class="w-full border-0 bg-transparent py-1 text-[11.5px] text-tag outline-none"
        onInput={(e) => setText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (e.isComposing || e.keyCode === 229) return
            e.preventDefault()
            submit()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancel()
          }
        }}
        onBlur={cancel}
      />
    </span>
  )
}
