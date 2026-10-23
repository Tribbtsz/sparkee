## 做了什么

<!-- 一句话说明这个 PR 改了什么 -->

## 为什么

<!-- 动机、关联的 issue，例如 Closes #12 -->

## 怎么验证的

<!-- 命令、步骤，界面改动附截图或录屏 -->

## 自查

- [ ] `pnpm lint` 与 `pnpm format:check` 通过
- [ ] `cd web && pnpm build` 通过
- [ ] `cd worker && pnpm typecheck` 通过
- [ ] e2e 跑过（或说明为什么不需要）
- [ ] 没有提交密钥、真实域名、账号 ID、D1 UUID
- [ ] 已发布过的 migration 没有改动（新迁移另建文件）
- [ ] 改了 `web/public/sw.js` 的话，`CACHE` 版本号已加一
