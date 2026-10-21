import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: {
    port: 5173,
    // 开发期把 /api 代理到本地 Worker（cf dev）：前端始终同源，既没有 CORS，
    // 也不用在 .env 里写死地址（生产环境由 Workers Assets 托管 web/dist，天然同源）。
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    // 本地用 preview 冒烟测试生产产物时，也把 /api 代理过去。
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // 带内容哈希的输出文件名由 Vite 默认行为提供，这里只把体积大的依赖单独拆包。
    chunkSizeWarningLimit: 700,
  },
})
