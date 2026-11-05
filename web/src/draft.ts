/**
 * 输入卡草稿的本地持久化：刷新、离线或误关页面后还能接着写。
 * 存储失败（隐私模式 / 配额满）时静默降级为仅内存。
 */

const NOTE_KEY = 'sparkee_draft_note'
const TODO_KEY = 'sparkee_draft_todo'

function read(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* 存不了就算了 */
  }
}

export function loadNoteDraft(): string {
  return read(NOTE_KEY)
}

export function saveNoteDraft(value: string): void {
  write(NOTE_KEY, value)
}

export function loadTodoDraft(): string {
  return read(TODO_KEY)
}

export function saveTodoDraft(value: string): void {
  write(TODO_KEY, value)
}
