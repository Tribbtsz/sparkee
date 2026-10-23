# Sparkee

[![ci](https://github.com/Tribbtsz/sparkee/actions/workflows/ci.yml/badge.svg)](https://github.com/Tribbtsz/sparkee/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A524-5fa04e.svg)](.nvmrc)

极简闪念速记：卡片流（归档 + 标签）与待办本（一级文件夹 + 有序待办）。

前端是 **Preact + Vite + TailwindCSS v4** 的 PWA；后端是 **Cloudflare Workers + D1**
（SQLite），路由用 **Hono**。没有服务器、没有常驻进程，部署和数据库都在 Cloudflare。

## 功能

- 闪念卡片：新建、编辑、置顶、归档、删除（归档/删除三次点击确认）
- `#标签` 自动提取，标签筛选、全文搜索、按日期筛选（跨时区正确）
- 待办本：一级文件夹、排序、完成态、未完成计数
- PWA：安装到主屏/桌面，独立窗口；前端发版后重开即新版
- 浅色 / 深色 / 跟随系统
- 单用户访问口令，Bearer 鉴权

## 技术栈

- **前端**：Preact 10、Vite 8、TailwindCSS 4、TypeScript
- **后端**：Cloudflare Workers、D1、Hono
- **工具**：新版 `cf` CLI（`cloudflare.config.ts`）+ Wrangler 打包器、pnpm
- 没有 ORM、没有 Workbox、没有服务端框架

## 目录

```text
.
├── web/                      # 前端 PWA
│   ├── src/                  # Preact 源码（app / api / components / theme）
│   ├── public/               # manifest、图标、sw.js、离线页
│   ├── scripts/              # 图标生成、e2e 自测
│   ├── vite.config.ts
│   └── package.json
├── worker/                   # Cloudflare Worker 后端
│   ├── src/index.ts          # Hono 路由 / 鉴权 / CORS
│   ├── src/store.ts          # D1 查询
│   ├── src/util.ts           # 时间、标签、LIKE 转义
│   ├── migrations/           # D1 迁移
│   ├── cloudflare.config.ts  # Worker / D1 / 域名（全部读环境变量）
│   ├── wrangler.config.ts    # 静态资源目录 / 本地端口
│   ├── .env.example          # 部署用的本地配置模板（复制成 .env）
│   └── package.json
├── .github/                  # CI、issue / PR 模板、dependabot
├── CONTRIBUTING.md           # 怎么参与
├── SECURITY.md               # 威胁模型与漏洞上报
├── CODE_OF_CONDUCT.md
└── LICENSE
```

## 本地开发

要求：Node.js 24+、pnpm 10+、Cloudflare 账号（只在部署时需要）。

```bash
# 1. 先构建一次前端（cf dev 会托管 web/dist）
cd web
pnpm install
pnpm build

# 2. 本地 D1 + Worker
cd ../worker
pnpm install
pnpm db:migrate:local          # 在 .wrangler/state 里建表（占位 D1 ID）
printf 'SPARKEE_TOKEN=dev-token\n' > .dev.vars   # PowerShell 用 Set-Content
pnpm dev                        # http://127.0.0.1:8787
```

前端热更新另开一个终端：

```bash
cd web
pnpm dev                        # http://localhost:5173，/api 代理到 8787
```

`cf dev` 用本机 SQLite 模拟 D1，不需要登录 Cloudflare，也不花钱。

## 环境变量

仓库里不写死任何真实域名、账号或数据库 ID。

| 变量 | 用在哪 | 说明 |
| --- | --- | --- |
| `SPARKEE_TOKEN` | Worker secret | 访问口令；留空 = 不鉴权，只适合本地 |
| `CLOUDFLARE_ACCOUNT_ID` | 部署命令 | 可选；不填时 `cf` 用当前登录账号 |
| `SPARKEE_D1_ID` | 部署命令 | 远程 D1 的 UUID；本地默认用占位 ID |
| `SPARKEE_DOMAIN` | 部署命令 | 自定义域名；不填则只部署到 `*.workers.dev` |

`cloudflare.config.ts` 只读这些环境变量，仓库里没有任何真实值。fork 之后填自己的：

```bash
# 在仓库根目录执行
cp worker/.env.example worker/.env
$EDITOR worker/.env        # 填 account / d1 / domain，用不到的留空
```

`worker/.env` 已被 gitignore，`cf` 加载配置时会自动读取（cf 命令都在 `worker/` 目录下运行）。
文件里没有的项回落到下面的占位值，所以 CI 和不建 `.env` 的本地开发都能直接跑；
真实环境里已有的同名变量优先于文件内容。

口令 `SPARKEE_TOKEN` 不走这个文件，它随 Worker 版本一起上传，见「部署」。

## 部署

```bash
cd worker
cf auth login

# 创建数据库（记下返回的 uuid）
cf d1 create sparkee --primary-location-hint enam

export CLOUDFLARE_ACCOUNT_ID=<account-id>
export SPARKEE_D1_ID=<d1-uuid>
export SPARKEE_DOMAIN=sparkee.example.com

cf d1 migrations apply "$SPARKEE_D1_ID" --dir migrations

cd ../web && pnpm build && cd ../worker
printf 'SPARKEE_TOKEN=<long-random-token>\n' > secrets.env
pnpm release -- --secrets-file secrets.env
```

PowerShell 里把 `export` 换成：

```powershell
$env:CLOUDFLARE_ACCOUNT_ID='<account-id>'
$env:SPARKEE_D1_ID='<d1-uuid>'
$env:SPARKEE_DOMAIN='sparkee.example.com'
```

（这三个也可以写进 `worker/.env`，就不必每次 export；见「环境变量」。）

说明：

- `pnpm release -- --secrets-file ...` 会把口令和 Worker 版本一起上传，
  不存在“先部署、后设口令”的空窗。`--` 是给 pnpm 的参数分隔符。
- 之后改前端只需 `cd web && pnpm build && cd ../worker && pnpm release`。
- 部署前可以先 `pnpm release -- --dry-run` 验证构建。
- 自定义域名需要在同一个 Cloudflare 账号的 DNS 下；不填 `SPARKEE_DOMAIN` 就用
  `https://<worker>.<subdomain>.workers.dev`。

## PWA

`web/public/manifest.webmanifest` + 图标（192 / 512 / maskable / apple-touch）提供安装信息；
`web/public/sw.js` 负责可安装性和离线兜底：

- 页面导航：网络优先，失败回退缓存的 `/`，再回退 `/error.html`；
- `/assets/*`（内容哈希）：缓存优先；
- `/api/*`：永不缓存，数据必须实时。

改了 SW 逻辑就把 `CACHE` 的版本号加一。用浏览器打开站点，菜单里的
「安装应用 / 添加到主屏幕」即可；发版后重开就是新版。

## API

所有 `/api/*` 需要 `Authorization: Bearer <SPARKEE_TOKEN>`，`/api/health` 除外。

```text
GET    /api/health
GET    /api/stats
GET    /api/tags
GET    /api/notes?archived&tag&q&date&tz
POST   /api/notes
PUT    /api/notes/{id}
DELETE /api/notes/{id}
GET    /api/todo-folders
POST   /api/todo-folders
PUT    /api/todo-folders/{id}
DELETE /api/todo-folders/{id}
GET    /api/todos?folder&sort&order
POST   /api/todos
PUT    /api/todos/{id}
DELETE /api/todos/{id}
```

时间统一存 UTC ISO 字符串（`YYYY-MM-DDTHH:MM:SS.sssZ`）。按日期筛选时前端带上
浏览器时区偏移 `tz`（分钟，东为正），后端换算成 UTC 的 `[当天 00:00, 次日 00:00)`。

## 备份

D1 自带 **Time Travel**，保留最近 30 天：

```bash
cf d1 time-travel get-bookmark "$SPARKEE_D1_ID"
cf d1 time-travel restore "$SPARKEE_D1_ID" --bookmark <bookmark>
```

不需要自建定时快照。

## 测试

```bash
cd worker
pnpm typecheck

# 另开一个终端
pnpm db:migrate:local
printf 'SPARKEE_TOKEN=dev-token\n' > .dev.vars
pnpm dev

cd ../web
pnpm build
SPARKEE_TEST_BASE=http://127.0.0.1:8787 SPARKEE_TEST_TOKEN=dev-token pnpm e2e
```

e2e 直接 import `src/api.ts`，对真实 Worker 跑一遍闪念 + 待办本的读写、筛选和错误路径。
CI 用 `cf dev` + 本地 D1 跑同一套，不需要 Cloudflare 凭据。

## 贡献

欢迎 issue 和 PR。动手前看一眼 [CONTRIBUTING.md](CONTRIBUTING.md)：本地环境、代码约定、
提交信息格式和提交前自检都在里面。

- 安全问题**不要**开公开 issue，走 [SECURITY.md](SECURITY.md) 里的私密渠道。
- 参与即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
- 依赖更新由 `.github/dependabot.yml` 每周提 PR，合并前跑 CI。

## License

[MIT](LICENSE) © Sparkee contributors
