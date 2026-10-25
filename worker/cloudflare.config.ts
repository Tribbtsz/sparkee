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
    // 与 dashboard 上的远程配置保持一致，否则 cf deploy 的 --strict 检查会中止上传。
    // 远程当前是「总开关关、traces 开」——这是控制台里遗留的状态，先对齐让部署跑通；
    // 之后想打开日志，在控制台把三个开关一起开，再把这里同步成一样的值。
    observability: {
      enabled: false,
      issues: { enabled: false },
      traces: { enabled: true },
      logs: { enabled: true },
    },
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
