import { render } from 'preact'
import './style.css'
import { App } from './app.tsx'

render(<App />, document.getElementById('app')!)

// 生产环境注册 Service Worker：安装 PWA、离线兜底都靠它。
// 开发环境不注册，避免缓存干扰 Vite 的热更新。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 注册失败不影响正常使用 */
    })
  })
}
