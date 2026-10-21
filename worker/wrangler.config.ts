import { defineWranglerConfig } from 'wrangler/experimental-config'

export default defineWranglerConfig({
  // 静态资源来自前端构建产物；cf deploy 不运行 web 的 build 脚本，先 `pnpm --dir web build`。
  assetsDirectory: '../web/dist',
  dev: {
    port: 8787,
  },
  types: {
    generate: true,
  },
})
