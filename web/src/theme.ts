import { useEffect, useState } from 'preact/hooks'

/**
 * 主题：跟随系统 / 浅色 / 深色。
 *
 * 实现要点：CSS 里只认 `:root[data-theme='light'|'dark']`，「跟随系统」由这里
 * 解析成具体值再写上去。好处是系统主题变化时能实时跟随，而且用户手动选的主题
 * 不会被 `prefers-color-scheme` 媒体查询盖掉。首屏防闪烁靠 index.html 里的内联脚本。
 */
export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'sparkee.theme'

/** 与 index.html 里 <meta name="theme-color"> 保持一致。 */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#F7F8FA',
  dark: '#0D0E11',
}

export const THEME_OPTIONS: { value: ThemeMode; label: string; title: string }[] = [
  { value: 'system', label: '跟随系统', title: '跟随系统：系统切深色我就切深色' },
  { value: 'light', label: '明', title: '明：始终用浅色' },
  { value: 'dark', label: '暗', title: '暗：始终用深色' },
]

function darkQuery(): MediaQueryList {
  return window.matchMedia('(prefers-color-scheme: dark)')
}

export function getThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    // 隐私模式下 localStorage 可能抛错，忽略即可
  }
  return 'system'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return darkQuery().matches ? 'dark' : 'light'
  return mode
}

/** 把主题写到 <html> 和浏览器地址栏底色上，返回实际生效的主题。 */
export function applyTheme(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveTheme(mode)
  const root = document.documentElement
  root.dataset.theme = resolved
  // 让浏览器地址栏跟着变
  root.style.colorScheme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[resolved])
  return resolved
}

/**
 * 主题状态。选「跟随系统」时订阅系统主题变化实时切换。
 * 只有一处调用（App），设置弹窗通过 props 传入的回调改写它。
 */
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode)

  useEffect(() => {
    applyTheme(mode)
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // 存不下就算了，本次会话仍然生效
    }
    if (mode !== 'system') return

    const mq = darkQuery()
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  return [mode, setMode]
}
