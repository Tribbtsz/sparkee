import { render } from 'preact'
import './style.css'
import { App } from './app.tsx'

render(<App />, document.getElementById('app')!)

// 首屏占位层（index.html 内联）在应用挂载后移除。
// 加载够快（用户还没看到占位层）就直接拿掉，避免每次打开都闪一下 logo；
// 已经停留了一段时间则淡出，衔接更自然。
const boot = document.getElementById('boot')
if (boot) {
  if (performance.now() > 600) {
    boot.classList.add('boot-done')
    window.setTimeout(() => boot.remove(), 220)
  } else {
    boot.remove()
  }
}

// 生产环境注册 Service Worker：安装 PWA、离线兜底都靠它。
// 开发环境不注册，避免缓存干扰 Vite 的热更新。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 注册失败不影响正常使用 */
    })
  })
}
