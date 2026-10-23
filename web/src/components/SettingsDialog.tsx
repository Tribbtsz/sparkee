import { useEffect, useRef, useState } from 'preact/hooks'
import {
  displayBaseUrl,
  getToken,
  setBaseUrl,
  setToken,
  testConnection,
  validateBaseUrl,
} from '../api'
import { Check, Edit } from '../icons'
import { Spinner } from './Spinner'

interface Props {
  onClose: () => void
  /** 已把地址和密码写进 localStorage，上层据此关弹窗并重拉数据。 */
  onSaved: () => void
}

/**
 * 服务器配置弹窗。
 * 「访问密码」非编辑态显示为 ••••••••，右侧一个编辑/确认按钮切换；
 * 留空表示不带鉴权头（本地默认如此）。
 */
export function SettingsDialog({ onClose, onSaved }: Props) {
  const [url, setUrl] = useState(displayBaseUrl)
  const [token, setTokenValue] = useState(getToken)
  const [tokenEditing, setTokenEditing] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const tokenRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (tokenEditing) tokenRef.current?.focus()
  }, [tokenEditing])

  function save() {
    const problem = validateBaseUrl(url)
    if (problem) {
      setUrlError(problem)
      return
    }
    setBaseUrl(url)
    setToken(token)
    onSaved()
  }

  async function runTest() {
    const problem = validateBaseUrl(url)
    if (problem) {
      setUrlError(problem)
      return
    }
    setUrlError(null)
    setTestState('testing')
    setTestMessage('')
    try {
      await testConnection(url, token)
      setTestState('ok')
      setTestMessage('连接成功，密码可用')
    } catch (e) {
      setTestState('fail')
      setTestMessage(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="服务器配置"
        class="pop-in w-full max-w-[440px] rounded-composer bg-surface p-6 shadow-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 class="m-0 text-[18px] font-semibold text-ink">服务器配置</h2>

        <p class="mt-3 mb-0 text-[14px] leading-relaxed text-ink-2">
          默认走同源，不需要填；本地开发可填 http://127.0.0.1:8787（cf dev）。 填别的实例时请用
          HTTPS 地址。
        </p>

        <label class="mt-3.5 block">
          <span class="mb-1.5 block text-[12px] text-ink-2">后端 API 地址</span>
          <input
            value={url}
            placeholder="https://sparkee.example.com"
            inputmode="url"
            autocapitalize="off"
            autocorrect="off"
            spellcheck={false}
            aria-invalid={urlError !== null}
            class="h-11 w-full rounded-btn border border-line bg-transparent px-3 text-[15px] text-ink outline-none focus:border-lime"
            onInput={(e) => {
              setUrl(e.currentTarget.value)
              setUrlError(null)
              setTestState('idle')
            }}
          />
          {urlError !== null && <span class="mt-1 block text-[12px] text-danger">{urlError}</span>}
        </label>

        <div class="mt-3.5">
          <span class="mb-1.5 block text-[12px] text-ink-2">访问密码</span>
          <div class="flex items-center gap-1">
            <div class="min-w-0 flex-1">
              {tokenEditing ? (
                <input
                  ref={tokenRef}
                  type="password"
                  value={token}
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck={false}
                  class="h-11 w-full rounded-btn border border-line bg-transparent px-3 text-[15px] text-ink outline-none focus:border-lime"
                  onInput={(e) => {
                    setTokenValue(e.currentTarget.value)
                    setTestState('idle')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
                      e.preventDefault()
                      setTokenEditing(false)
                    }
                  }}
                />
              ) : (
                <div class="flex h-11 items-center rounded-btn border border-line px-3 text-[15px] tracking-[2px] text-ink-2">
                  {token ? '••••••••' : '未设置'}
                </div>
              )}
            </div>
            <button
              type="button"
              title={tokenEditing ? '完成' : '修改'}
              aria-label={tokenEditing ? '完成' : '修改'}
              class="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
              onClick={() => setTokenEditing((v) => !v)}
            >
              {tokenEditing ? <Check size={20} /> : <Edit size={20} />}
            </button>
          </div>
        </div>

        <p class="mt-2 mb-0 text-[12px] leading-relaxed text-ink-2">
          密码需与后端启动时设置的 SPARKEE_TOKEN 一致；留空表示不鉴权，本地默认如此。
        </p>

        {testState !== 'idle' && testMessage !== '' && (
          <p
            class={`mt-3 mb-0 text-[12px] leading-relaxed ${
              testState === 'ok' ? 'text-[#3F6B00] dark:text-lime' : 'text-danger'
            }`}
          >
            {testMessage}
          </p>
        )}

        <div class="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={testState === 'testing'}
            class="mr-auto inline-flex cursor-pointer items-center gap-1.5 rounded-btn px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-black/[0.06] disabled:cursor-default disabled:opacity-60 dark:hover:bg-white/[0.08]"
            onClick={() => void runTest()}
          >
            {testState === 'testing' && <Spinner size={14} width={2} />}
            {testState === 'testing' ? '测试中' : '测试连接'}
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-btn px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            class="cursor-pointer rounded-btn bg-lime px-4 py-2.5 text-[14px] font-bold text-lime-on hover:brightness-95"
            onClick={save}
          >
            保存并重试
          </button>
        </div>
      </div>
    </div>
  )
}
