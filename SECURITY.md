# 安全策略

## 支持范围

只有 `main` 分支的最新提交会收到修复。项目是**单用户自托管**应用，不提供多租户隔离，
也不承诺对不同部署之间的数据隔离做安全边界。

## 报告漏洞

**不要**在公开 issue 里贴漏洞细节或可直接利用的 PoC。

- 首选：[私密安全公告](https://github.com/Tribbtsz/sparkee/security/advisories/new)
- 或者邮件 <tribbtsz@gmail.com>，标题带上 `[sparkee security]`

请附上：受影响的提交或版本、复现步骤、影响面，以及你希望的署名方式。

我会在 7 天内确认收到；修复发布后在这里和 release notes 里致谢（除非你要求匿名）。

## 威胁模型

这套东西很小，安全边界也很直白：

- **一个共享口令**。所有 `/api/*`（`/api/health` 除外）都要求
  `Authorization: Bearer <SPARKEE_TOKEN>`。**拿到口令就等于拿到全部数据**，没有角色和权限区分。
  口令泄露后请立刻轮换：改 `secrets.env`，重新 `pnpm release -- --secrets-file secrets.env`。
- **空口令 = 不鉴权**。这是本地开发的便利，不要这样部署到公网。
- **口令存在浏览器 `localStorage`**，所以 XSS 会直接导致口令和全部笔记泄露。前端目前不渲染
  用户 HTML（纯文本 + 少量格式），请保持这一点：不要引入 `dangerouslySetInnerHTML`、
  也不要渲染第三方 HTML。
- **仓库里不放任何真实值**。账号 ID、D1 UUID、自定义域名放本地的 `worker/.env`（已 gitignore）；
  线上口令用 `--secrets-file` 随版本上传，不进仓库、不进日志。
- **依赖**。Dependabot 会提 PR，合并前跑一遍 CI；安全相关的升级优先处理。

## 部署自查

- `SPARKEE_TOKEN` 足够长且随机（例如 `openssl rand -hex 32`）。
- 没有把 `worker/.env`、`secrets.env`、`.dev.vars` 提交进仓库。
- 自定义域名已开启 HTTPS（Cloudflare 默认提供）。
