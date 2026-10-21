/* Sparkee Service Worker
 *
 * 目标只有两个：
 *   1. 让浏览器把站点当作可安装的 PWA（Edge/Chrome 的安装条件之一）；
 *   2. 断网时至少能看到一个完整的离线兜底页。
 *
 * 策略：
 *   - 页面导航：网络优先，失败时回退缓存的 /，再回退 /error.html；
 *   - /assets/*（文件名带内容哈希）：缓存优先；
 *   - /api/*：永不缓存，数据必须实时；
 *   - 其余同源 GET：走网络。
 *
 * 改了这里的逻辑就把 CACHE 的版本号加一，旧缓存会在 activate 时清掉。
 */

const CACHE = 'sparkee-shell-v1'
const SHELL = ['/', '/error.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match('/')
          .then((cached) => cached || caches.match('/error.html'))
          .then((cached) => cached || Response.error()),
      ),
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
      }),
    )
  }
})
