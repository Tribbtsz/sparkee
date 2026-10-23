import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'worker/.wrangler/**',
      'worker/.cloudflare/**',
      // 由 web/scripts/gen-icons.mjs 生成的单行路径数据，不手改
      'web/src/icons.tsx',
      // 原样托管的静态资源：sw.js / 离线页 / manifest / 图标
      'web/public/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 前端：浏览器全局 + Preact JSX
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Preact 的 hooks 规则与 React 一致；react-hooks v7 新增的编译器规则
      // 是按 React 语义写的，这里只开两条经典规则。
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // 后端：Workers 运行时提供 fetch / crypto / URL 等 Web 标准全局
  {
    files: ['worker/src/**/*.ts'],
    languageOptions: {
      globals: globals.worker,
    },
  },

  // 构建脚本、e2e、cf / vite 配置：Node 全局
  {
    files: [
      'web/scripts/**/*.{ts,mjs}',
      'web/vite.config.ts',
      'worker/*.config.ts',
      'eslint.config.mjs',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    rules: {
      // 允许用 _ 前缀标记“故意不用”的参数
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
)
