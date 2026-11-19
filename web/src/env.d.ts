/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 原生壳构建时注入的默认 API 地址；网页端不使用。 */
  readonly VITE_NATIVE_BASE_URL?: string
}
