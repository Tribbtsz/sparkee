import { useEffect, useRef, useState } from 'preact/hooks'

/** 松手触发刷新所需的最小拉动距离（px）。 */
const THRESHOLD = 56
/** 刷新期间指示器保持张开的高度（px）。 */
const HOLD = 52
/** 手指位移 → 实际拉动距离的阻尼，越拉越沉。 */
const DAMPING = 0.5
/** 单次最多拉这么远，免得拽出半个屏幕。 */
const MAX_PULL = 88

export interface PullState {
  /** 当前拉动距离（px）：撑开指示器并位移内容。 */
  pull: number
  /** 手指是否正在拖 —— 拖的时候必须关掉过渡动画，否则跟不上手。 */
  dragging: boolean
}

/**
 * 移动端下拉刷新。
 *
 * 只在「列表已经滚到顶部 + 单指向下拖」时才接管手势，其余情况原样交给原生滚动；
 * 松手时超过阈值就调用 onRefresh，并让指示器保持张开到请求结束。
 *
 * 监听必须用原生 addEventListener：touchmove 在被动（passive）监听里
 * preventDefault 无效，会导致下拉时页面和指示器一起动。
 */
export function usePullToRefresh(
  ref: { current: HTMLElement | null },
  onRefresh: () => Promise<unknown>,
): PullState {
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)

  // 回调放 ref 里：onRefresh 每次渲染都是新函数，直接进依赖会反复解绑/重绑监听。
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh
  const busyRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return bindPullToRefresh(el, {
      isBusy: () => busyRef.current,
      setBusy: (busy) => {
        busyRef.current = busy
      },
      pull: setPull,
      dragging: setDragging,
      onRefresh: () => refreshRef.current(),
    })
  }, [ref])

  return { pull, dragging }
}

interface Handlers {
  isBusy: () => boolean
  setBusy: (busy: boolean) => void
  pull: (px: number) => void
  dragging: (on: boolean) => void
  onRefresh: () => Promise<unknown>
}

/** 把触摸监听绑到滚动容器上，返回解绑函数。el 已确保非空。 */
function bindPullToRefresh(el: HTMLElement, h: Handlers): () => void {
  let startY = 0
  let tracking = false
  let distance = 0

  function start(e: TouchEvent) {
    if (h.isBusy() || e.touches.length !== 1 || el.scrollTop > 0) return
    startY = e.touches[0].clientY
    tracking = true
    distance = 0
  }

  function move(e: TouchEvent) {
    if (!tracking || h.isBusy()) return
    const dy = e.touches[0].clientY - startY
    // 往上滑，或者列表已经滚起来了 → 放弃接管，交回原生滚动
    if (dy <= 0 || el.scrollTop > 0) {
      if (distance !== 0) {
        distance = 0
        h.pull(0)
        h.dragging(false)
      }
      tracking = false
      return
    }
    distance = Math.min(dy * DAMPING, MAX_PULL)
    h.dragging(true)
    h.pull(distance)
    e.preventDefault()
  }

  function end() {
    if (!tracking) return
    tracking = false
    h.dragging(false)

    if (distance >= THRESHOLD) {
      h.setBusy(true)
      h.pull(HOLD)
      void Promise.resolve(h.onRefresh())
        .catch(() => undefined)
        .finally(() => {
          h.setBusy(false)
          h.pull(0)
        })
      return
    }
    distance = 0
    h.pull(0)
  }

  el.addEventListener('touchstart', start, { passive: true })
  el.addEventListener('touchmove', move, { passive: false })
  el.addEventListener('touchend', end)
  el.addEventListener('touchcancel', end)
  return () => {
    el.removeEventListener('touchstart', start)
    el.removeEventListener('touchmove', move)
    el.removeEventListener('touchend', end)
    el.removeEventListener('touchcancel', end)
  }
}
