/**
 * 纯函数工具：时间、标签、LIKE 转义、常量时间比较。
 */

/** 固定宽度的 UTC 时间格式。字符串比较 == 时间比较。 */
export function nowIso(): string {
  return new Date().toISOString()
}

export class BadDateError extends Error {}

/**
 * 把客户端的 YYYY-MM-DD + 时区偏移（分钟，东为正）解析成 UTC 当天 00:00 的毫秒数。
 * 严格校验：2026-02-30 这种日期会被拒绝。
 */
export function parseDateInZone(dateStr: string, tzMinutes: number): number {
  if (!Number.isInteger(tzMinutes) || tzMinutes < -14 * 60 || tzMinutes > 14 * 60) {
    throw new BadDateError('invalid tz')
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) throw new BadDateError('invalid date')

  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const utc = Date.UTC(year, month - 1, day)
  const check = new Date(utc)
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    throw new BadDateError('invalid date')
  }
  return utc - tzMinutes * 60_000
}

const TAG_RE = /#([\p{L}\p{N}_-]+)/gu

/** 从正文提取 #标签：转小写、去重、保持出现顺序。 */
export function extractTags(content: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const match of content.matchAll(TAG_RE)) {
    const tag = match[1]!.toLowerCase()
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }
  return tags
}

/** 转义 LIKE 通配符，让用户输入的 _ 和 % 按字面量搜索。 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/** 比较口令时不让长度/前缀差异泄露在耗时里（WebCrypto 不提供定长比较）。 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
