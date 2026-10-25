import { bindings, defineConfig } from 'cf/config'
import * as entrypoint from './src/index.ts' with { type: 'cf-worker' }

// cloudflare.config.ts 由 cf CLI 在 Node 里加载，process.env 可用；
// 这里只声明类型，避免为一份配置引入 @types/node。
declare const process: {
  env: Record<string, string | undefined>
  loadEnvFile?: (path?: string) => void
}

// 本地开发/部署的私有配置放在 worker/.env（已 gitignore）。
// CI 或没建 .env 时自动忽略，继续用下面的占位值。
try {
  process.loadEnvFile?.('.env')
} catch {
  /* no .env */
}

// 真实域名 / 账号 / D1 都不写进仓库：
//   CLOUDFLARE_ACCOUNT_ID  可选；不填时 cf 用当前登录账号
//   SPARKEE_D1_ID          远程部署必填；本地默认用一个占位 UUID
//   SPARKEE_DOMAIN         自定义域名；不填则只部署到 workers.dev
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
const d1Id = process.env.SPARKEE_D1_ID?.trim() || '11111111-1111-4111-8111-111111111111'
const domain = process.env.SPARKEE_DOMAIN?.trim()

export default defineConfig({
  ...(accountId ? { accountId } : {}),
  worker: {
    name: 'sparkee',
    compatibilityDate: '2026-10-25',
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
