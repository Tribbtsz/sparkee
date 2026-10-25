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
├── package.json              # 仓库根的 lint / format 工具与脚本
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

推送主分支不会自动部署——仓库里只有跑检查的 `ci.yml`。要「推送即上线」是在
Cloudflare 控制台开 Git 集成，仓库里不用放任何密钥。

### 控制台 Git 集成（推荐）

Workers & Pages → 选中 `sparkee` → Settings → **Builds** → Connect GitHub。
授权走 OAuth，不用建 API token。三个字段：

| 字段 | 值 |
| --- | --- |
| Build command | 留空 |
| Deploy command | `pnpm run deploy` |
| Preview command | `pnpm run preview` |

构建配置里还要给两个变量（值在本机 `worker/.env`）：`SPARKEE_D1_ID`、
`SPARKEE_DOMAIN`。`SPARKEE_TOKEN` 可不给——`cf deploy` 会沿用线上已有的 secret。

### 本机手动部署

首次先登录、建库，把返回的 uuid 填进 `worker/.env` 的 `SPARKEE_D1_ID`：

```bash
cd worker
cf auth login
cf d1 create sparkee --primary-location-hint enam
```

之后每次发版就一条命令（装依赖 → 构建前端 → cf deploy）：

```bash
pnpm run deploy
```

必须是 `pnpm run deploy`：`pnpm deploy` 会命中 pnpm 的内置命令，报
`A deploy is only possible from inside a workspace`。

说明：

- `cf deploy` **不跑数据库迁移**。改了表结构要手动
  `cf d1 migrations apply "$SPARKEE_D1_ID" --dir migrations`。
- 想只验证构建不真发：`pnpm --dir worker release -- --dry-run`。
- 自定义域名要在同一个 Cloudflare 账号的 DNS 下；`SPARKEE_DOMAIN` 留空则只部署到
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

代码风格由仓库根的 ESLint + Prettier 管：

```bash
# 在仓库根目录
pnpm install
pnpm lint           # eslint，开了 --max-warnings 0
pnpm format:check   # 只检查；`pnpm format` 直接改写
```

功能测试分两层：

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
