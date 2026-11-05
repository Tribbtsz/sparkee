import { useEffect, useRef, useState } from 'preact/hooks'
import {
  displayBaseUrl,
  fetchNotes,
  fetchTodoFolders,
  fetchTodos,
  getBaseUrl,
  getToken,
  setBaseUrl,
  setToken,
  testConnection,
  validateBaseUrl,
} from '../api'
import { Check, Edit } from '../icons'
import { Spinner } from './Spinner'
import { toast } from './Toast'

interface Props {
  onClose: () => void
  /** 已把地址和密码写进 localStorage；base 为 true 表示换了服务器实例。 */
  onSaved: (changed: { base: boolean }) => void
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
  const [exporting, setExporting] = useState(false)
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
    const previousBase = getBaseUrl()
    setBaseUrl(url)
    setToken(token)
    onSaved({ base: getBaseUrl() !== previousBase })
  }

  /** 把当前服务器的全部数据导出成一个 JSON 文件（不含访问口令）。 */
  async function exportBackup() {
    if (exporting) return
    setExporting(true)
    try {
      const [active, archived, folders, todos] = await Promise.all([
        fetchNotes({ archived: false }),
        fetchNotes({ archived: true }),
        fetchTodoFolders(),
        fetchTodos({}),
      ])
      const payload = {
        app: 'sparkee',
        exported_at: new Date().toISOString(),
        server: displayBaseUrl(),
        notes: [...active, ...archived],
        todo_folders: folders,
        todos,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `sparkee-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      toast('备份已导出')
    } catch (e) {
      toast(`导出失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setExporting(false)
    }
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
          默认走同源，不需要填；本地开发可填 http://127.0.0.1:8787（cf dev）。
          目标服务器需在 CORS 中放行当前站点来源（同源和本机回环地址默认可用），否则请求会被浏览器拦下。
          切换地址会清空当前列表并重新加载，避免把旧数据写到新实例。
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
            class="h-11 w-full rounded-btn border-0 bg-surface-2 px-3 text-[15px] text-ink outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-lime motion-reduce:transition-none"
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
                  class="h-11 w-full rounded-btn border-0 bg-surface-2 px-3 text-[15px] text-ink outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-lime motion-reduce:transition-none"
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
                <div class="flex h-11 items-center rounded-btn bg-surface-2 px-3 text-[15px] tracking-[2px] text-ink-2">
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
          密码需与后端设置的 SPARKEE_TOKEN 一致。服务端未配置口令时只接受本机回环地址访问，
          线上实例必须设置。
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
          <div class="mr-auto flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={testState === 'testing'}
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-btn px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-black/[0.06] disabled:cursor-default disabled:opacity-60 dark:hover:bg-white/[0.08]"
              onClick={() => void runTest()}
            >
              {testState === 'testing' && <Spinner size={14} width={2} />}
              {testState === 'testing' ? '测试中' : '测试连接'}
            </button>
            <button
              type="button"
              disabled={exporting}
              title="导出当前服务器上的闪念、文件夹和待办"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-btn px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-black/[0.06] disabled:cursor-default disabled:opacity-60 dark:hover:bg-white/[0.08]"
              onClick={() => void exportBackup()}
            >
              {exporting && <Spinner size={14} width={2} />}
              {exporting ? '导出中' : '导出备份'}
            </button>
          </div>
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
