/**
 * 从 @material-symbols/svg-400 里挑出用到的图标，内联生成 src/icons.tsx。
 *
 * 为什么要"拷"而不是直接 import：
 *   - 不引图标字体、不走 CDN，首屏零额外请求；
 *   - 只把十几个图标打进包里，而不是整包 3 万个 svg；
 *   - 保留 rounded / outlined 两套风格。
 *
 * 用法：node scripts/gen-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '../node_modules/@material-symbols/svg-400')
const outFile = resolve(here, '../src/icons.tsx')

/** 组件名 -> [源文件, 中文注释] */
const ICONS = [
  ['Bolt', 'rounded/bolt-fill.svg', '闪电（品牌标）'],
  ['Menu', 'rounded/menu.svg', '汉堡菜单（窄屏抽屉）'],
  ['PinFilled', 'rounded/keep-fill.svg', '图钉（置顶标记，实心）'],
  ['PinOutline', 'outlined/keep.svg', '图钉（置顶/取消置顶操作，细线）'],
  ['Archive', 'outlined/archive.svg', '归档（细线）'],
  ['Unarchive', 'outlined/unarchive.svg', '移出归档（细线）'],
  ['Delete', 'outlined/delete.svg', '删除（细线）'],
  ['Tag', 'rounded/tag-fill.svg', '标签'],
  ['Today', 'rounded/today-fill.svg', '今日'],
  ['Schedule', 'rounded/schedule-fill.svg', '时刻'],
  ['Search', 'rounded/search-fill.svg', '搜索'],
  ['Close', 'rounded/close-fill.svg', '关闭/清除'],
  ['Refresh', 'rounded/refresh-fill.svg', '刷新'],
  ['CalendarMonth', 'rounded/calendar_month-fill.svg', '日期筛选'],
  ['CalendarToday', 'rounded/calendar_today-fill.svg', '日期筛选条上的小日历'],
  ['Add', 'rounded/add-fill.svg', '新增'],
  ['Edit', 'outlined/edit.svg', '编辑'],
  ['Tune', 'rounded/tune-fill.svg', '服务器配置'],
  ['Check', 'rounded/check-fill.svg', '确认'],
  ['FlashOn', 'rounded/flash_on-fill.svg', '全部闪念'],
  ['Lightbulb', 'rounded/lightbulb-fill.svg', '灵感'],
  ['Bookmark', 'rounded/bookmark-fill.svg', '书签'],
  ['CloudOff', 'rounded/cloud_off-fill.svg', '连不上后端'],
  ['EditNote', 'rounded/edit_note-fill.svg', '空状态'],
  ['MoreHoriz', 'rounded/more_horiz-fill.svg', '更多'],
  ['Checklist', 'rounded/checklist.svg', '待办本'],
  ['Folder', 'rounded/folder-fill.svg', '待办文件夹'],
  ['CreateNewFolder', 'rounded/create_new_folder-fill.svg', '新建文件夹'],
  ['Sort', 'rounded/sort-fill.svg', '排序'],
  ['CheckCircle', 'rounded/check_circle-fill.svg', '已完成'],
  ['RadioButtonUnchecked', 'outlined/radio_button_unchecked.svg', '未完成'],
]

/** 把 svg 里的 path 转成 JSX 可用的写法（属性名去 kebab-case）。 */
function toJsx(inner) {
  return inner
    .replace(/\s*\/>/g, ' />')
    .replace(/([a-z]+)-([a-z]+)=/g, (_, a, b) => `${a}${b[0].toUpperCase()}${b.slice(1)}=`)
    .trim()
}

function extract(file) {
  const svg = readFileSync(resolve(pkgRoot, file), 'utf8')
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 -960 960 960'
  return { body: toJsx(body), viewBox }
}

const parts = [
  `/* 由 scripts/gen-icons.mjs 自动生成，请勿手改。`,
  ` *`,
  ` * 图标取自 @material-symbols/svg-400（rounded / outlined，400 字重），`,
  ` * 只保留本项目用到的这些，路径内联成组件：不引字体、不走 CDN。`,
  ` */`,
  `import type { JSX } from 'preact';`,
  ``,
  `export interface IconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'size'> {`,
  `  /** 边长（px），默认 20。 */`,
  `  size?: number | string;`,
  `}`,
  ``,
]

for (const [name, file, comment] of ICONS) {
  const { body, viewBox } = extract(file)
  parts.push(
    `/** ${comment}（${file}） */`,
    `export function ${name}({ size = 20, ...rest }: IconProps) {`,
    `  return (`,
    `    <svg viewBox="${viewBox}" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>`,
    `      ${body}`,
    `    </svg>`,
    `  );`,
    `}`,
    ``,
  )
}

writeFileSync(outFile, parts.join('\n'), 'utf8')
console.log(`已生成 ${outFile}（${ICONS.length} 个图标）`)
