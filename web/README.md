# Sparkee Web（Preact + Vite + TypeScript + TailwindCSS v4）

单页 PWA，生产环境由 `worker/` 的 Workers Assets 托管。页面与 API 同源，
所以默认走相对路径 `/api/...`，不需要配置服务器地址。

## 开发

```bash
cd web
pnpm install
pnpm dev        # http://localhost:5173
```

开发时 `/api` 由 Vite 代理到本地 Worker（`http://127.0.0.1:8787`，见 `vite.config.ts`）。

> 需要本地后端在跑：`cd worker && pnpm db:migrate:local && pnpm dev`。

## 构建

```bash
pnpm build                                    # tsc -b && vite build -> dist/
pnpm exec tsc --noEmit -p tsconfig.app.json   # 只做类型检查
```

产物由 Workers Assets 托管（`worker/wrangler.config.ts` 的 `assetsDirectory: '../web/dist'`）。

## PWA

`public/manifest.webmanifest` + 图标提供安装信息；`public/sw.js` 只做两件事：
让浏览器把站点当成可安装的 PWA，以及断网时回到自包含的离线页。

- 页面导航：网络优先，失败回退缓存的 `/` / `error.html`；
- `/assets/*`：缓存优先（文件名带内容哈希）；
- `/api/*`：永不缓存。

改了 SW 逻辑就把 `CACHE` 版本号加一。SW 只在生产环境注册（`src/main.tsx`）。

## API 客户端

`src/api.ts` 封装了所有接口。默认同源；如果确实要连别的实例，可以在
「服务器配置」里覆盖地址和口令，存在：

- `localStorage.sparkee_server_url`（留空 = 同源）
- `localStorage.sparkee_server_token`

「测试连接」会用输入值请求 `/api/stats`，不会先写 localStorage。

## 主题

侧栏底部的三档切换（跟随系统 / 明 / 暗）存在 `localStorage.sparkee.theme`。
CSS 只认 `:root[data-theme='light'|'dark']`，「跟随系统」由 `src/theme.ts` 解析成
具体值再写上去；首屏防闪烁靠 `index.html` 里的内联脚本。

## 图标

- UI 图标：`src/icons.tsx` 由 `scripts/gen-icons.mjs` 从 `@material-symbols/svg-400`
  抽取路径内联生成，不引图标字体、不走 CDN。
- PWA 图标：`public/icon-192.png` / `icon-512.png` / `icon-maskable-512.png` /
  `apple-touch-icon.png`（青柠底 + 黑色闪电）。

## 端到端自测

```bash
pnpm e2e
SPARKEE_TEST_BASE=http://127.0.0.1:8787 SPARKEE_TEST_TOKEN=dev-token pnpm e2e
```

脚本直接 import `src/api.ts`，对真实 Worker 跑一遍读写、筛选和错误路径。
CI 的完整流程见根目录 `.github/workflows/ci.yml`。

## 设计 token

全部在 `src/style.css`：浅深两套 CSS 变量 + `@theme inline` 映射成
Tailwind 的 `bg-card` / `text-ink` / `border-line` …，不需要逐处写 `dark:`。
移动端安全区由 `.app-shell` 统一处理。
