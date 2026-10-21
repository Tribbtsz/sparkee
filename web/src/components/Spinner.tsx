interface Props {
  /** 直径（px）。 */
  size?: number
  /** 线宽（px）。 */
  width?: number
  class?: string
}

/** 转圈指示器：用 border 拼一个缺口环，不引任何依赖。 */
export function Spinner({ size = 16, width = 2, class: cls }: Props) {
  return (
    <span
      role="status"
      aria-label="加载中"
      class={`inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent align-middle ${cls ?? ''}`}
      style={{ width: `${size}px`, height: `${size}px`, borderWidth: `${width}px` }}
    />
  )
}
