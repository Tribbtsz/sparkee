# Sparkee

[![ci](https://github.com/Tribbtsz/sparkee/actions/workflows/ci.yml/badge.svg)](https://github.com/Tribbtsz/sparkee/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%E2%89%A524-5fa04e.svg)](.nvmrc)

极简闪念速记：卡片流（归档 + 标签）与待办本（一级文件夹 + 有序待办）。
前端是 **Preact + Vite + TailwindCSS v4** 的 PWA；后端是 **Cloudflare Workers + D1**
（SQLite），路由用 **Hono**。没有常驻服务器，部署和数据库都在 Cloudflare。

## 功能

- 闪念卡片：新建、编辑、置顶、归档、删除（危险操作三次确认）
- `#标签` 自动提取，标签筛选、全文搜索、按日期筛选（跨时区正确）
- 待办本：一级文件夹、排序、完成态、未完成计数
- PWA：安装到主屏/桌面，独立窗口；发版后重开即新版
- 浅色 / 深色 / 跟随系统
- 单用户访问口令，Bearer 鉴权

## 技术栈

- **前端**：Preact 10、Vite 8、TailwindCSS 4、TypeScript
- **后端**：Cloudflare Workers、D1、Hono
- **工具**：`cf` CLI、Wrangler、pnpm
- 没有 ORM、没有 Workbox、没有服务端框架

## 快速开始

要求 Node.js 24+、pnpm 10+；只有部署需要 Cloudflare 账号。

```bash
# 1. 构建前端（cf dev 托管 web/dist）
cd web && pnpm install && pnpm build

# 2. 本地 D1 + Worker
cd ../worker && pnpm install
pnpm db:migrate:local
printf 'SPARKEE_TOKEN=dev-token\n' > .dev.vars   # PowerShell 用 Set-Content
pnpm dev                                          # http://127.0.0.1:8787
```

前端热更新另开终端：`cd web && pnpm dev`（`http://localhost:5173`，`/api` 代理到 8787）。
`cf dev` 用本机 SQLite 模拟 D1，不需要登录 Cloudflare。

## 配置

`worker/.env`（已 gitignore）保存部署配置，模板见 `worker/.env.example`：

| 变量 | 用在哪 | 说明 |
| --- | --- | --- |
| `SPARKEE_TOKEN` | Worker secret | 访问口令；未设置时只允许本机回环地址访问，线上必须设置 |
| `CLOUDFLARE_ACCOUNT_ID` | 部署命令 | 可选；不填时 `cf` 用当前登录账号 |
| `SPARKEE_D1_ID` | 部署命令 | 远程 D1 的 UUID；本地默认用占位 ID |
| `SPARKEE_DOMAIN` | 部署命令 | 自定义域名；不填则只部署到 `*.workers.dev` |
| `VITE_NATIVE_BASE_URL` | 原生壳构建 | App 的默认 API 地址；不填则需在 App 内手动配置 |

```bash
cp worker/.env.example worker/.env
$EDITOR worker/.env
```

前四项写进 `worker/.env`；`VITE_NATIVE_BASE_URL` 在原生壳构建时作为环境变量传入，
不写进 `.env`。口令 `SPARKEE_TOKEN` 也不走这个文件，随 Worker 版本上传。

当前代码不写死真实域名、账号 ID 或 D1 UUID；原生壳的默认地址由
`VITE_NATIVE_BASE_URL` 注入。

## 部署

部署在 Cloudflare：Workers Builds 的 Git 集成（推送即构建）或本机 `cf deploy`。
GitHub Actions 的 `ci.yml` 只跑检查，不负责发布。完整步骤、数据库迁移和备份见
[docs/deploy.md](docs/deploy.md)。

## API

所有 `/api/*` 需要 `Authorization: Bearer <SPARKEE_TOKEN>`，`/api/health` 除外。
未设置口令时，只有 `localhost` / `127.0.0.1` / `::1` 的请求放行，其余返回 503。

```text
GET    /api/health · /api/stats · /api/tags
GET    /api/notes?archived&tag&q&date&tz
POST   /api/notes · PUT/DELETE /api/notes/{id}
GET/POST /api/todo-folders · PUT/DELETE /api/todo-folders/{id}
GET    /api/todos?folder&sort&order
POST   /api/todos · PUT/DELETE /api/todos/{id}
```

时间统一存 UTC ISO 字符串；按日期筛选时前端带浏览器时区偏移 `tz`（分钟，东为正）。

## 备份

应用内「服务器设置 → 导出备份」下载完整 JSON（不含口令）。D1 自带 30 天
Time Travel，恢复命令见 [docs/deploy.md](docs/deploy.md)。

## 测试

```bash
pnpm install && pnpm lint && pnpm format:check   # 仓库根目录
cd worker && pnpm typecheck
cd ../web && SPARKEE_TEST_BASE=http://127.0.0.1:8787 SPARKEE_TEST_TOKEN=dev-token pnpm e2e
```

e2e 直接 import `src/api.ts`，对真实 Worker 跑读写、筛选和错误路径；CI 用 `cf dev`
+ 本地 D1 跑同一套。

## 贡献

欢迎 issue / PR，动手前看 [CONTRIBUTING.md](CONTRIBUTING.md)。安全问题走私密渠道，
见 [SECURITY.md](SECURITY.md)；参与即表示遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

## License

[MIT](LICENSE) © 2026 Tribbtsz