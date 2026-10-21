import { bindings, defineConfig } from 'cf/config'
import * as entrypoint from './src/index.ts' with { type: 'cf-worker' }

// cloudflare.config.ts 由 cf CLI 在 Node 里加载，process.env 可用；
// 这里只声明类型，避免为一份配置引入 @types/node。
declare const process: { env: Record<string, string | undefined> }

// 真实域名 / 账号 / D1 都不写进仓库：
//   CLOUDFLARE_ACCOUNT_ID  可选；不填时 cf 用当前登录账号
//   SPARKEE_D1_ID          远程部署必填；本地默认用一个占位 UUID
//   SPARKEE_DOMAIN         自定义域名；不填则只部署到 workers.dev
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
const d1Id = process.env.SPARKEE_D1_ID?.trim() || '00000000-0000-0000-0000-000000000000'
const domain = process.env.SPARKEE_DOMAIN?.trim()

export default defineConfig({
  ...(accountId ? { accountId } : {}),
  worker: {
    name: 'sparkee',
    compatibilityDate: '2026-10-01',
    entrypoint,
    observability: { enabled: true },
    assets: {
      notFoundHandling: 'single-page-application',
      runWorkerFirst: ['/api/*'],
    },
    ...(domain ? { domains: [domain] } : {}),
    env: {
      DB: bindings.d1({
        name: 'sparkee',
        id: d1Id,
      }),
      SPARKEE_TOKEN: bindings.secret(),
    },
  },
})
