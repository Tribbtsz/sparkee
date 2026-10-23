# 参与贡献

感谢你愿意改进 Sparkee。这份文档说明怎么跑起来、代码里有哪些约定，以及提交时的要求。

## 开始之前

- **Node.js 24+**、**pnpm 10+**（`corepack enable` 即可启用仓库声明的版本，见 `.nvmrc`）。
- 只改前端不需要 Cloudflare 账号：本地 D1 由 `cf dev` 用 SQLite 模拟。
- 较大的改动（新功能、重构、换依赖）请先开 issue 说明方向，避免白做。
- 安全问题不要开公开 issue，见 [SECURITY.md](SECURITY.md)。

## 本地跑起来

完整步骤见 README 的「本地开发」，最短路径：

```bash
cd web && pnpm install && pnpm build
cd ../worker && pnpm install && pnpm db:migrate:local
printf 'SPARKEE_TOKEN=dev-token\n' > .dev.vars    # PowerShell: Set-Content .dev.vars 'SPARKEE_TOKEN=dev-token'
pnpm dev                                          # http://127.0.0.1:8787
```

前端热更新另开一个终端：`cd web && pnpm dev`（`/api` 代理到 8787）。

## 提交前自检

CI 跑同一套，本地先过一遍能省一轮往返：

```bash
cd web && pnpm build                                        # tsc -b && vite build
cd ../worker && pnpm typecheck                              # cf workers types && tsc
cd ../web && SPARKEE_TEST_BASE=http://127.0.0.1:8787 \
  SPARKEE_TEST_TOKEN=dev-token pnpm e2e                     # 需要 worker 正在跑
```

PowerShell 里把续行反斜杠换成反引号，或直接写成一行。

## 代码约定

- **依赖克制**：前端只有 Preact，后端只有 Hono。新依赖要能说清为什么非它不可。
- **前端样式走 token**：颜色、圆角、间距都用 `web/src/style.css` 里的 CSS 变量和 Tailwind 语义类（`bg-card` / `text-ink` / `border-line`…），不要写死色值，也不要逐处写 `dark:`。
- **后端分层**：D1 语句集中在 `worker/src/store.ts`，路由只做参数校验和组装响应。
- **时间**：数据库一律存 UTC ISO 字符串（`YYYY-MM-DDTHH:MM:SS.sssZ`），按日期筛选的时区换算只在查询层做。
- **文案**：界面和接口错误信息都是中文，e2e 会断言部分错误文案，改的时候一起改。
- **迁移**：`worker/migrations/` 里已经发布过的文件不要改，新增 `000N_描述.sql`。
- **Service Worker**：改了 `web/public/sw.js` 的逻辑，就把 `CACHE` 版本号加一。

## 提交信息

用 Conventional Commits 的简化写法，一句话说清做了什么，正文解释为什么：

```text
feat: 待办支持拖拽排序
fix(ci): 本地 D1 用合法 UUID 占位
docs: 补充 worker/.env 的用法
```

范围可以用 `web` / `worker` / `ci` / `docs`。

## Pull Request

- 一个 PR 只做一件事，说明动机、做法和验证方式，界面改动附截图。
- 不要提交密钥、真实域名、账号 ID、D1 UUID（详见 [SECURITY.md](SECURITY.md)）。
- 动了依赖就在对应目录跑 `pnpm install`，并把 `pnpm-lock.yaml` 一起提交。
- 保证 CI 全绿再请求评审。

## 行为准则

参与本项目即表示同意遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
