/**
 * 部署前准备 worker/secrets.env。
 *
 * cf deploy 要求把 cloudflare.config.ts 里声明的 secret（SPARKEE_TOKEN）随版本一起上传。
 * CI 里这个值来自构建变量（环境变量 SPARKEE_TOKEN），本机则沿用已有的 worker/secrets.env。
 *
 * 用法：node worker/scripts/build-secrets.mjs
 */
import { existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const target = fileURLToPath(new URL('../secrets.env', import.meta.url))
const token = (process.env.SPARKEE_TOKEN ?? '').trim()

if (token === '') {
  if (existsSync(target)) {
    console.log('SPARKEE_TOKEN 未设置，沿用已有的 worker/secrets.env')
    process.exit(0)
  }
  console.error('缺少 SPARKEE_TOKEN：既没有环境变量，也没有 worker/secrets.env')
  process.exit(1)
}

writeFileSync(target, `SPARKEE_TOKEN=${token}\n`, { mode: 0o600 })
console.log('已从环境变量写入 worker/secrets.env')
