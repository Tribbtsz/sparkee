/* 由 scripts/gen-icons.mjs 自动生成，请勿手改。
 *
 * 图标取自 @material-symbols/svg-400（rounded / outlined，400 字重），
 * 只保留本项目用到的这些，路径内联成组件：不引字体、不走 CDN。
 */
import type { JSX } from 'preact';

export interface IconProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, 'size'> {
  /** 边长（px），默认 20。 */
  size?: number | string;
}

/** 闪电（品牌标）（rounded/bolt-fill.svg） */
export function Bolt({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M360-360H217q-18 0-26.5-16t2.5-31l338-488q8-11 20-15t24 1q12 5 19 16t5 24l-39 309h176q19 0 27 17t-4 32L388-66q-8 10-20.5 13T344-55q-11-5-17.5-16T322-95l38-265Z" />
    </svg>
  );
}

/** 汉堡菜单（窄屏抽屉）（rounded/menu.svg） */
export function Menu({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M150-240q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-210q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-210q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z" />
    </svg>
  );
}

/** 图钉（置顶标记，实心）（rounded/keep-fill.svg） */
export function PinFilled({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M634-780v332l77 68q5 5 7 10.6 2 5.59 2 11.56v17.16q0 12.68-8.62 21.18-8.63 8.5-21.38 8.5H510v236q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63Q450-62.25 450-75v-236H270q-12.75 0-21.37-8.58-8.63-8.59-8.63-21.28v-17.17q0-5.97 2-11.47 2-5.5 7-10.5l71-68v-332h-20q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h354q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5h-20Z" />
    </svg>
  );
}

/** 图钉（置顶/取消置顶操作，细线）（outlined/keep.svg） */
export function PinOutline({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m634-448 86 77v60H510v241l-30 30-30-30v-241H240v-60l80-77v-332h-50v-60h414v60h-50v332Zm-313 77h312l-59-55v-354H380v354l-59 55Zm156 0Z" />
    </svg>
  );
}

/** 归档（细线）（outlined/archive.svg） */
export function Archive({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m480-270 156-156-40-40-86 86v-201h-60v201l-86-86-40 40 156 156ZM180-674v494h600v-494H180Zm0 554q-24.75 0-42.37-17.63Q120-155.25 120-180v-529q0-9.88 3-19.06 3-9.18 9-16.94l52-71q8-11 20.94-17.5Q217.88-840 232-840h495q14.12 0 27.06 6.5T775-816l53 71q6 7.76 9 16.94 3 9.18 3 19.06v529q0 24.75-17.62 42.37Q804.75-120 780-120H180Zm17-614h565l-36.41-46H233l-36 46Zm283 307Z" />
    </svg>
  );
}

/** 移出归档（细线）（outlined/unarchive.svg） */
export function Unarchive({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M480-581 324-425l40 40 86-86v201h60v-201l86 86 40-40-156-156Zm-300-93v494h600v-494H180Zm0 554q-24.75 0-42.37-17.63Q120-155.25 120-180v-529q0-9.88 3-19.06 3-9.18 9-16.94l52-71q8-11 20.94-17.5Q217.88-840 232-840h495q14.12 0 27.06 6.5T775-816l53 71q6 7.76 9 16.94 3 9.18 3 19.06v529q0 24.75-17.62 42.37Q804.75-120 780-120H180Zm17-614h565l-36.41-46H233l-36 46Zm283 307Z" />
    </svg>
  );
}

/** 删除（细线）（outlined/delete.svg） */
export function Delete({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M261-120q-24.75 0-42.37-17.63Q201-155.25 201-180v-570h-41v-60h188v-30h264v30h188v60h-41v570q0 24-18 42t-42 18H261Zm438-630H261v570h438v-570ZM367-266h60v-399h-60v399Zm166 0h60v-399h-60v399ZM261-750v570-570Z" />
    </svg>
  );
}

/** 标签（rounded/tag-fill.svg） */
export function Tag({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m338-319-35 137q-2 10-9.5 16t-17.5 6q-14 0-23-11t-5-25l31-123H158q-14 0-23.5-11.5T129-356q2-10 10-16.5t19-6.5h136l51-202H224q-14 0-23.5-11.5T195-618q2-10 10-16.5t19-6.5h136l34-137q2-10 9.5-16t17.5-6q14 0 22.5 10.5T449-765l-30 124h203l34-137q2-10 9.5-16t17.5-6q14 0 22.5 10.5T711-765l-30 124h121q14 0 23.5 11.5T831-604q-2 10-10 16.5t-19 6.5H666l-51 202h121q14 0 23.5 11.5T765-342q-2 10-10 16.5t-19 6.5H600l-35 137q-2 10-9.5 16t-17.5 6q-14 0-23-11t-5-25l31-123H338Zm15-60h203l51-202H404l-51 202Z" />
    </svg>
  );
}

/** 今日（rounded/today-fill.svg） */
export function Today({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M284-338.18q-28-28.19-28-69Q256-448 284.18-476q28.19-28 69-28Q394-504 422-475.82q28 28.19 28 69Q450-366 421.82-338q-28.19 28-69 28Q312-310 284-338.18ZM180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q310-861.6 310-848v28h340v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q715-861.6 715-848v28h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Z" />
    </svg>
  );
}

/** 时刻（rounded/schedule-fill.svg） */
export function Schedule({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M513-492v-171q0-13-8.5-21.5T483-693q-13 0-21.5 8.5T453-663v183q0 6 2 11t6 10l144 149q9 10 22.5 9.5T650-310q9-9 9-22t-9-22L513-492ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-82 31.5-155t86-127.5Q252-817 325-848.5T480-880q82 0 155 31.5t127.5 86Q817-708 848.5-635T880-480q0 82-31.5 155t-86 127.5Q708-143 635-111.5T480-80Z" />
    </svg>
  );
}

/** 搜索（rounded/search-fill.svg） */
export function Search({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M378-329q-108.16 0-183.08-75Q120-479 120-585t75-181q75-75 181.5-75t181 75Q632-691 632-584.85 632-542 618-502q-14 40-42 75l242 240q9 8.56 9 21.78T818-143q-9 9-22.22 9-13.22 0-21.78-9L533-384q-30 26-69.96 40.5Q423.08-329 378-329Zm-1-60q81.25 0 138.13-57.5Q572-504 572-585t-56.87-138.5Q458.25-781 377-781q-82.08 0-139.54 57.5Q180-666 180-585t57.46 138.5Q294.92-389 377-389Z" />
    </svg>
  );
}

/** 关闭/清除（rounded/close-fill.svg） */
export function Close({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M480-438 270-228q-9 9-21 9t-21-9q-9-9-9-21t9-21l210-210-210-210q-9-9-9-21t9-21q9-9 21-9t21 9l210 210 210-210q9-9 21-9t21 9q9 9 9 21t-9 21L522-480l210 210q9 9 9 21t-9 21q-9 9-21 9t-21-9L480-438Z" />
    </svg>
  );
}

/** 刷新（rounded/refresh-fill.svg） */
export function Refresh({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M480-160q-133 0-226.5-93.5T160-480q0-133 93.5-226.5T480-800q85 0 149 34.5T740-671v-99q0-13 8.5-21.5T770-800q13 0 21.5 8.5T800-770v194q0 13-8.5 21.5T770-546H576q-13 0-21.5-8.5T546-576q0-13 8.5-21.5T576-606h138q-38-60-97-97t-137-37q-109 0-184.5 75.5T220-480q0 109 75.5 184.5T480-220q75 0 140-39.5T717-366q5-11 16.5-16.5t22.5-.5q12 5 16 16.5t-1 23.5q-39 84-117.5 133.5T480-160Z" />
    </svg>
  );
}

/** 日期筛选（rounded/calendar_month-fill.svg） */
export function CalendarMonth({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q310-861.6 310-848v28h340v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q715-861.6 715-848v28h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Zm300-260q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-188.5-11.5Q280-423 280-440t11.5-28.5Q303-480 320-480t28.5 11.5Q360-457 360-440t-11.5 28.5Q337-400 320-400t-28.5-11.5ZM640-400q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-188.5-11.5Q280-263 280-280t11.5-28.5Q303-320 320-320t28.5 11.5Q360-297 360-280t-11.5 28.5Q337-240 320-240t-28.5-11.5ZM640-240q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z" />
    </svg>
  );
}

/** 日期筛选条上的小日历（rounded/calendar_today-fill.svg） */
export function CalendarToday({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M180-80q-24 0-42-18t-18-42v-620q0-24 18-42t42-18h65v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q310-861.6 310-848v28h340v-28q0-13.6 9-22.8 9-9.2 23.02-9.2t23.5 9.2Q715-861.6 715-848v28h65q24 0 42 18t18 42v620q0 24-18 42t-42 18H180Zm0-60h600v-430H180v430Z" />
    </svg>
  );
}

/** 新增（rounded/add-fill.svg） */
export function Add({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M450-450H230q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h220v-220q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v220h220q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H510v220q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63-8.5-8.62-8.5-21.37v-220Z" />
    </svg>
  );
}

/** 编辑（outlined/edit.svg） */
export function Edit({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M180-180h44l472-471-44-44-472 471v44Zm-60 60v-128l575-574q8-8 19-12.5t23-4.5q11 0 22 4.5t20 12.5l44 44q9 9 13 20t4 22q0 11-4.5 22.5T823-694L248-120H120Zm659-617-41-41 41 41Zm-105 64-22-22 44 44-22-22Z" />
    </svg>
  );
}

/** 服务器配置（rounded/tune-fill.svg） */
export function Tune({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M435.5-128.63Q427-137.25 427-150v-165q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v53h323q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H487v52q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63ZM150-202q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h187q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm165.5-174.63Q307-385.25 307-398v-52H150q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h157v-54q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v166q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63ZM457-450q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h353q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H457Zm144.5-173.63Q593-632.25 593-645v-165q0-12.75 8.68-21.38 8.67-8.62 21.5-8.62 12.82 0 21.32 8.62 8.5 8.63 8.5 21.38v52h157q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H653v53q0 12.75-8.68 21.37-8.67 8.63-21.5 8.63-12.82 0-21.32-8.63ZM150-698q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h353q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z" />
    </svg>
  );
}

/** 确认（rounded/check-fill.svg） */
export function Check({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m378-332 363-363q9-9 21.5-9t21.5 9q9 9 9 21.5t-9 21.5L399-267q-9 9-21 9t-21-9L175-449q-9-9-8.5-21.5T176-492q9-9 21.5-9t21.5 9l159 160Z" />
    </svg>
  );
}

/** 全部闪念（rounded/flash_on-fill.svg） */
export function FlashOn({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M404.5-138.5Q400-144 400-152v-248h-60q-25 0-42.5-17.5T280-460v-360q0-25 17.5-42.5T340-880h278q23 0 38 18.5t8 41.5l-64 220h74q27 0 40 24t-3 47L441-139q-5 7-11.5 8.5T416-131q-7-2-11.5-7.5Z" />
    </svg>
  );
}

/** 灵感（rounded/lightbulb-fill.svg） */
export function Lightbulb({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M422.5-103.5Q399-127 399-161h162q0 34-23.5 57.5T480-80q-34 0-57.5-23.5ZM348-223q-13 0-21.5-8.5T318-253q0-13 8.5-21.5T348-283h264q13 0 21.5 8.5T642-253q0 13-8.5 21.5T612-223H348Zm-25-121q-66-43-104.5-107.5T180-597q0-122 89-211t211-89q122 0 211 89t89 211q0 81-38 145.5T637-344H323Z" />
    </svg>
  );
}

/** 书签（rounded/bookmark-fill.svg） */
export function Bookmark({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m480-240-196 84q-30 13-57-5t-27-50v-574q0-24 18-42t42-18h440q24 0 42 18t18 42v574q0 32-27 50t-57 5l-196-84Z" />
    </svg>
  );
}

/** 连不上后端（rounded/cloud_off-fill.svg） */
export function CloudOff({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M248-171q-88 0-148-59T40-377q0-80 50.5-134T217-577q2-14 6.5-31.5T236-640L91-785q-9-9-9-21t9-21q9-9 21-9t21 9l707 707q9 9 9 21t-9 21q-9 9-21.5 9T797-78l-94-93H248Zm606-31L316-733q36-29 77.5-42.5T478-789q111 0 190.5 79T748-520v21q72-1 122 45t50 117q0 35-16.5 73.5T854-202Z" />
    </svg>
  );
}

/** 空状态（rounded/edit_note-fill.svg） */
export function EditNote({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M190-410q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h240q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H190Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h410q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H190Zm0-165q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h410q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H190Zm330 550v-81q0-5.57 2-10.78 2-5.22 7-10.22l211.61-210.77q9.11-9.12 20.25-13.18Q772-520 783-520q12 0 23 4.5t20 13.5l37 37q9 9 13 20t4 22q0 11-4.5 22.5t-13.58 20.62L652-169q-5 5-10.22 7-5.21 2-10.78 2h-81q-12.75 0-21.37-8.63Q520-177.25 520-190Zm263-194 37-39-37-37-38 38 38 38ZM580-220h38l121-122-18-19-19-18-122 121v38Zm0 0v-38l122-121 37 37-121 122h-38Z" />
    </svg>
  );
}

/** 更多（rounded/more_horiz-fill.svg） */
export function MoreHoriz({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M207.86-432Q188-432 174-446.14t-14-34Q160-500 174.14-514t34-14Q228-528 242-513.86t14 34Q256-460 241.86-446t-34 14Zm272 0Q460-432 446-446.14t-14-34Q432-500 446.14-514t34-14Q500-528 514-513.86t14 34Q528-460 513.86-446t-34 14Zm272 0Q732-432 718-446.14t-14-34Q704-500 718.14-514t34-14Q772-528 786-513.86t14 34Q800-460 785.86-446t-34 14Z" />
    </svg>
  );
}

/** 待办本（rounded/checklist.svg） */
export function Checklist({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m222-299 158-158q9-9 21-8.5t21.39 9.5q8.61 9 8.61 21t-9 21L243-235q-9 9-21 9t-21-9L101-335q-9-9-9-21t9-21q9-9 21-8.5t21 8.5l79 78Zm0-320 158-158q9-9 21-8.5t21.39 9.5q8.61 9 8.61 21t-9 21L243-555q-9 9-21 9t-21-9L101-655q-9-9-9-21t9-21q9-9 21-8.5t21 8.5l79 78Zm328 329q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h300q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H550Zm0-320q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h300q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H550Z" />
    </svg>
  );
}

/** 待办文件夹（rounded/folder-fill.svg） */
export function Folder({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M140-160q-24 0-42-18.5T80-220v-520q0-23 18-41.5t42-18.5h256q12 0 23.5 5t19.5 13l42 42h339q23 0 41.5 18.5T880-680v460q0 23-18.5 41.5T820-160H140Z" />
    </svg>
  );
}

/** 新建文件夹（rounded/create_new_folder-fill.svg） */
export function CreateNewFolder({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M140-160q-24 0-42-18.5T80-220v-520q0-23 18-41.5t42-18.5h256q12.44 0 23.72 5t19.37 13.09L481-740h339q23 0 41.5 18.5T880-680v460q0 23-18.5 41.5T820-160H140Zm410-250v60q0 12.75 8.68 21.37 8.67 8.63 21.5 8.63 12.82 0 21.32-8.63 8.5-8.62 8.5-21.37v-60h60q12.75 0 21.38-8.68 8.62-8.67 8.62-21.5 0-12.82-8.62-21.32-8.63-8.5-21.38-8.5h-60v-60q0-12.75-8.68-21.38-8.67-8.62-21.5-8.62-12.82 0-21.32 8.62-8.5 8.63-8.5 21.38v60h-60q-12.75 0-21.37 8.68-8.63 8.67-8.63 21.5 0 12.82 8.63 21.32 8.62 8.5 21.37 8.5h60Z" />
    </svg>
  );
}

/** 排序（rounded/sort-fill.svg） */
export function Sort({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M150-240q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h180q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-210q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h420q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Zm0-210q-12.75 0-21.37-8.68-8.63-8.67-8.63-21.5 0-12.82 8.63-21.32 8.62-8.5 21.37-8.5h660q12.75 0 21.38 8.68 8.62 8.67 8.62 21.5 0 12.82-8.62 21.32-8.63 8.5-21.38 8.5H150Z" />
    </svg>
  );
}

/** 已完成（rounded/check_circle-fill.svg） */
export function CheckCircle({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="m421-389-98-98q-9-9-22-9t-23 10q-9 9-9 22t9 22l122 123q9 9 21 9t21-9l239-239q10-10 10-23t-10-23q-10-9-23.5-8.5T635-603L421-389Zm59 309q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Z" />
    </svg>
  );
}

/** 未完成（outlined/radio_button_unchecked.svg） */
export function RadioButtonUnchecked({ size = 20, ...rest }: IconProps) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" {...rest}>
      <path d="M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Z" />
    </svg>
  );
}
