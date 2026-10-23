/** 与后端 extractTags 保持同一套标签规则：字母、数字、下划线、短横线。 */
const TAG_RE = /#([\p{L}\p{N}_-]+)/gu

/** 取出内容里出现的标签：保留原始大小写、去重、按出现顺序。 */
export function tagsOf(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const re = new RegExp(TAG_RE.source, 'gu')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(m[1])
    }
  }
  return out
}

/** 正文去掉 #标签 之后的纯文本（标签已单独成行，不再混在正文里）。 */
export function bodyOf(text: string): string {
  return text
    .replace(/#([\p{L}\p{N}_-]+)/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/**
 * 移除正文里的某个 #标签（顺手整理多余空格）。
 * 用负向先行断言，避免删 "#工作" 时误伤 "#工作内容"。
 */
export function removeTag(text: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`#${escaped}(?![\\p{L}\\p{N}_-])`, 'giu')
  return text
    .replace(re, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/** 新增标签：只取合法字符，追加到正文末尾。 */
export function appendTag(text: string, raw: string): string {
  const cleaned = raw.trim().replace(/^#+/, '')
  const tag = /[\p{L}\p{N}_-]+/u.exec(cleaned)?.[0] ?? ''
  if (!tag) return text
  const needSpace = text.length > 0 && !text.endsWith(' ') && !text.endsWith('\n')
  return `${text}${needSpace ? ' ' : ''}#${tag} `
}

/** 周日开头的星期名（JS 的 getDay 就是周日起始，这里按它排）。 */
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * 时间显示规则：
 * <60s「刚刚」/ <60min「N分钟前」/ 今天 / 昨天 / 7 天内星期 / 更早完整日期。
 *
 * 注意：服务端返回带时区偏移的 RFC3339，new Date() 会自动转本地时区，
 * 后端返回的是带 Z 的 UTC 串，new Date() 会自动转成本地时间，不要再手动加偏移。
 */
export function formatTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - dt.getTime()
  if (diffMs < 60_000) return '刚刚'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}分钟前`

  const hm = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`
  if (sameDay(dt, now)) return `今天 ${hm}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (sameDay(dt, yesterday)) return `昨天 ${hm}`

  if (Math.floor(diffMs / 86_400_000) < 7) return `${WEEKDAYS[dt.getDay()]} ${hm}`
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${hm}`
}

/** 完整时间戳 YYYY-MM-DD HH:mm（用于 title 提示，补足相对时间的模糊性）。 */
export function formatDateTime(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return ''
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`
}

/** YYYY-MM-DD（本地时区）。 */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** HH:MM（本地时区）。 */
export function nowHm(): string {
  const d = new Date()
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** 让 textarea 跟着内容长高（上限 maxPx，超过就滚动）。 */
export function autoGrow(el: HTMLTextAreaElement | null, maxPx: number): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`
}

/** 在光标处插入文本，返回插入后的完整文本与新光标位置。 */
export function insertAtCursor(
  el: HTMLTextAreaElement | null,
  value: string,
  toInsert: string,
): { text: string; caret: number } {
  const start = el?.selectionStart ?? value.length
  const end = el?.selectionEnd ?? value.length
  return {
    text: value.slice(0, start) + toInsert + value.slice(end),
    caret: start + toInsert.length,
  }
}

/** 把光标移到末尾（受控 textarea 在下一帧才更新 DOM，所以放在 rAF 里）。 */
export function caretToEnd(el: HTMLTextAreaElement | null): void {
  requestAnimationFrame(() => {
    if (el) el.setSelectionRange(el.value.length, el.value.length)
  })
}

/** 拼接 class（跳过假值）。 */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
