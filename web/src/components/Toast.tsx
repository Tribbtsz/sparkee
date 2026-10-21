import { useEffect, useState } from 'preact/hooks'

/**
 * 极简 toast：任何地方调用 `toast('...')` 即可，挂在右下角堆叠显示。
 * 不引依赖、不用 Context —— 出错提示是全局唯一的横切关注点，模块级订阅最省事。
 */

interface ToastItem {
  id: number
  message: string
}

const DURATION_MS = 3200

let seq = 0
let items: ToastItem[] = []
const listeners = new Set<(list: ToastItem[]) => void>()

function emit(): void {
  for (const fn of listeners) fn(items)
}

export function toast(message: string): void {
  const item: ToastItem = { id: ++seq, message }
  items = [...items, item]
  emit()
  window.setTimeout(() => {
    items = items.filter((t) => t.id !== item.id)
    emit()
  }, DURATION_MS)
}

export function ToastHost() {
  const [list, setList] = useState<ToastItem[]>(items)

  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])

  if (list.length === 0) return null

  return (
    <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {list.map((t) => (
        <div
          key={t.id}
          role="alert"
          class="toast-enter pointer-events-auto max-w-[min(560px,100%)] rounded-btn bg-ink px-4 py-2.5 text-[13px] leading-relaxed break-words text-scaffold shadow-dialog"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
