/* Sparkee Service Worker
 *
 * 目标只有两个：
 *   1. 让浏览器把站点当作可安装的 PWA（Edge/Chrome 的安装条件之一）；
 *   2. 断网或弱网时至少能看到完整的界面外壳，再不济也有离线兜底页。
 *
 * 策略：
 *   - 页面导航：网络优先，但最多等 NAV_TIMEOUT 毫秒。手机（尤其安卓从桌面图标
 *     冷启动）经常卡在 DNS/TLS 建连上，fetch 迟迟不 reject；不设超时浏览器就一直
 *     白屏。超时后立即回退缓存的 /，后台继续等网络。
 *   - 外壳更新是原子的：先把新 HTML 引用的所有哈希资源缓存好，最后才替换 /；
 *     中途失败保留旧外壳，避免出现「HTML 指向不存在的 JS/CSS」的永久白屏。
 *   - /assets/*（文件名带内容哈希）与应用图标：缓存优先；
 *   - /api/*：永不缓存，数据必须实时；
 *   - 其余同源 GET：走网络。
 *
 * 注意：超时回退意味着旧版前端可能继续调用已经发布的接口，Worker 侧必须保持
 * 向后兼容（不要删除或改变已有字段/路由的语义）。
 *
 * 改了这里的逻辑就把 CACHE 的版本号加一，旧缓存会在 activate 时清掉。
 */

const CACHE = 'sparkee-shell-v3'
const NAV_TIMEOUT = 4000
const ICONS = [
  '/icon-192-v2.png',
  '/icon-512-v2.png',
  '/icon-maskable-512-v2.png',
  '/apple-touch-icon-v2.png',
  '/favicon-v2.png',
]
const SHELL = ['/error.html', '/manifest.webmanifest', ...ICONS]

function shellAssets(html) {
  return [...new Set(html.match(/\/assets\/[A-Za-z0-9._-]+/g) || [])]
}

// 把 '/' 和它引用的哈希资源当成一个事务：
// 先把所有资源缓存成功，最后才替换 '/'；任何一步失败都保留旧外壳。
async function storeShell(cache, response) {
  const html = await response.clone().text()
  const cached = await cache.match('/')
  if (cached && (await cached.text()) === html) return

  await Promise.all(shellAssets(html).map((url) => cache.add(url)))
  await cache.put('/', response)
}

async function precacheShell(cache) {
  const response = await fetch(new Request('/', { cache: 'reload' }))
  if (!response.ok) throw new Error('shell request failed')
  await storeShell(cache, response)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // 外壳必须完整成功：失败就让 install 失败，浏览器会保留旧的 SW 和旧缓存。
      // 图标/清单属于锦上添花，单个失败不影响激活。
      await precacheShell(cache)
      await Promise.allSettled(SHELL.map((url) => cache.add(url)))
      await self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.match('/'))
      .then((shell) => {
        // 新外壳确认可用后再清旧缓存；宁可多留一版，也不要把能用的离线壳删掉。
        if (!shell) return undefined
        return caches
          .keys()
          .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      })
      .then(() => self.clients.claim()),
  )
})

// 导航重定向：请求的 redirect 是 manual，同源 3xx 会变成 opaqueredirect，这里显式跟随一次。
function fetchNetwork(request) {
  return fetch(request).then((response) =>
    response.type === 'opaqueredirect' ? fetch(request.url, { redirect: 'follow' }) : response,
  )
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms))
}

async function errorPage() {
  return (await caches.match('/error.html')) || Response.error()
}

async function handleNavigation(request, network) {
  const cached = await caches.match('/')

  // 没有外壳（首次安装失败 / 缓存被清）：网络最多等 NAV_TIMEOUT，然后给离线页。
  if (!cached) {
    let response = null
    try {
      response = await Promise.race([network, sleep(NAV_TIMEOUT)])
    } catch {
      response = null
    }
    return response?.ok ? response : errorPage()
  }

  return new Promise((resolve) => {
    let done = false
    const finish = (response) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(response)
    }
    const timer = setTimeout(() => finish(cached), NAV_TIMEOUT)

    network
      .then((response) => {
        // 5xx / 运营商劫持页：宁可给缓存的外壳，由前端自己显示错误状态。
        if (response.ok) finish(response)
        else finish(cached)
      })
      .catch(() => finish(cached))
  })
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    const network = fetchNetwork(request)
    // waitUntil 必须同步注册，否则浏览器可能在背景更新完成前就终止 SW。
    // 只在前台导航到 '/' 时更新外壳，避免把 /error.html 的响应写成新外壳。
    if (url.pathname === '/') {
      event.waitUntil(
        network
          .then((response) => {
            if (!response.ok || response.type !== 'basic') return undefined
            // 必须在响应体被页面消费前 clone。
            const copy = response.clone()
            return caches.open(CACHE).then((cache) => storeShell(cache, copy))
          })
          .catch(() => undefined),
      )
    }
    event.respondWith(handleNavigation(request, network))
    return
  }

  if (url.pathname.startsWith('/assets/') || ICONS.includes(url.pathname)) {
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
