# 部署

前端和后端一起部署成一个 Cloudflare Worker：`web/dist` 作为静态资源，`/api/*`
由 Worker 处理，数据存在 D1。两种部署方式任选。

## 方式一：Cloudflare Workers Builds（Git 集成）

Workers & Pages → 选中 `sparkee` → Settings → **Builds** → Connect GitHub。
授权走 OAuth，不用建 API token。三个字段：

| 字段 | 值 |
| --- | --- |
| Build command | 留空 |
| Deploy command | `pnpm run deploy` |
| Preview command | `pnpm run preview` |

构建配置里必须提供这些变量：`SPARKEE_D1_ID`、`SPARKEE_DOMAIN`、`SPARKEE_TOKEN`。
`SPARKEE_TOKEN` 缺失时部署会直接失败：`pnpm run deploy` 会把它写进
`worker/secrets.env` 再随版本上传（`cf deploy` 不会自动沿用线上 secret）。
填的值应与线上当前口令一致，否则相当于换密码。

本仓库当前已连接 Workers Builds：推送 `main` 会触发构建部署，PR 也会触发构建检查。
不想自动部署就到 Cloudflare 控制台断开 Git 集成，或改用下面的手动方式。

## 方式二：本机手动部署

首次先登录、建库，把返回的 uuid 填进 `worker/.env` 的 `SPARKEE_D1_ID`：

```bash
cd worker
cf auth login
cf d1 create sparkee --primary-location-hint enam
```

之后每次发版，在仓库根目录执行：

```bash
pnpm run deploy
```

必须是 `pnpm run deploy`：`pnpm deploy` 会命中 pnpm 的内置命令，报
`A deploy is only possible from inside a workspace`。

它会依次安装依赖、构建前端、准备 `worker/secrets.env`，再 `cf deploy`。
只想验证构建不真发：`pnpm --dir worker release -- --dry-run`。

## 配置

`worker/.env`（已 gitignore）由 `cf` 自动读取，模板见 `worker/.env.example`：

```bash
cp worker/.env.example worker/.env
$EDITOR worker/.env        # 填 account / d1 / domain，用不到的留空
```

- `CLOUDFLARE_ACCOUNT_ID`：可选；不填时 `cf` 用当前登录账号。
- `SPARKEE_D1_ID`：远程部署必填；`cf d1 create sparkee` 返回的 UUID。
- `SPARKEE_DOMAIN`：自定义域名，必须在同一个 Cloudflare 账号的 DNS 下；留空则只部署到
  `https://<worker>.<subdomain>.workers.dev`。
- `SPARKEE_TOKEN`：不放进 `.env`，部署时用 `--secrets-file` 上传。

## 数据库迁移

`cf deploy` **不跑迁移**。改了表结构后手动执行：

```bash
cd worker
cf d1 migrations apply "$SPARKEE_D1_ID" --dir migrations
```

本地开发用 `pnpm db:migrate:local`。

## 备份与恢复

D1 自带 **Time Travel**，保留最近 30 天：

```bash
cf d1 time-travel get-bookmark "$SPARKEE_D1_ID"
cf d1 time-travel restore "$SPARKEE_D1_ID" --bookmark <bookmark>
```

应用内「服务器设置 → 导出备份」也能导出完整 JSON（不含访问口令），适合换实例或本地留档。

## 原生壳（Capacitor）

App 的页面与静态资源随安装包下发，不会自动跟随后端更新。构建时注入默认 API 地址：

```bash
cd web
VITE_NATIVE_BASE_URL=https://your-worker.example.com pnpm build
```

不注入时 App 的默认地址为空，需要在「服务器配置」里手动填写。只改 Worker 且 API
保持兼容时，旧 APK 不需要更新；改过前端则要重新打 APK 才会生效。