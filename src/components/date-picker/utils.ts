/** 按设计稿：周一为一周第一天 */
const WEEK_START = 1; // 1 = Monday

/** 获取某月 1 号是周几 (0=Sun, 1=Mon, ...)，设计稿以周一为一 */
export function getMonthStartWeekday(year: number, month: number): number {
  const d = new Date(year, month - 1, 1);
  let w = d.getDay(); // 0=Sun, 1=Mon, ...
  w = w === 0 ? 7 : w; // 0 当作 7（周日）
  return w - WEEK_START; // 周一=0, 周二=1, ..., 周日=6
}

/** 某月天数 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 某月日历格子需要的行数（含上月尾、下月头） */
export function getCalendarWeeks(year: number, month: number): number {
  const startOffset = getMonthStartWeekday(year, month);
  const days = getDaysInMonth(year, month);
  const total = startOffset + days;
  return Math.ceil(total / 7);
}

/** 格式化为输入框显示：YYYY/MM/DD */
export function formatDateForInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** 解析用户输入的日期字符串，支持 YYYY/MM/DD、YYYY-MM-DD、YYYYMMDD 等，1970 年后有效 */
export function parseDateInput(s: string): Date | null {
  const raw = s.trim().replace(/\s/g, "");
  if (!raw) return null;
  const normalized = raw.replace(/-/g, "/");
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1970) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 判断两日是否同一天 */
export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 判断日期是否在区间内（含端点） */
export function isInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const t = date.getTime();
  const s = Math.min(start.getTime(), end.getTime());
  const e = Math.max(start.getTime(), end.getTime());
  return t >= s && t <= e;
}

/** 判断是否为区间起点日 */
export function isRangeStart(date: Date, start: Date | null, end: Date | null): boolean {
  if (!start) return false;
  return isSameDay(date, start);
}

/** 判断是否为区间终点日 */
export function isRangeEnd(date: Date, start: Date | null, end: Date | null): boolean {
  if (!end) return false;
  return isSameDay(date, end);
}

/** 过去 N 天（含今天）：从今天倒推 N 天，包含今日 */
export function getLastNDaysRange(n: number): [Date, Date] {
  if (n < 1) n = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - (n - 1));
  return [start, end];
}

/** 判断范围是否为「过去 N 天（含今天）」并返回 N，否则返回 null */
export function getLastNDaysFromRange(
  start: Date | null,
  end: Date | null,
): number | null {
  if (!start || !end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!isSameDay(end, today)) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const expectedStart = new Date(today);
  expectedStart.setDate(expectedStart.getDate() - (days - 1));
  if (!isSameDay(start, expectedStart)) return null;
  return days > 0 ? days : null;
}

/** 过去 N 天（截止昨天）：从昨天倒推 N 天，不包含今天 */
export function getLastNDaysRangeExcludeToday(n: number): [Date, Date] {
  if (n < 1) n = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const end = new Date(yesterday);
  const start = new Date(yesterday);
  start.setDate(start.getDate() - (n - 1));
  return [start, end];
}

/** 判断范围是否为「过去 N 天（截止昨天）」并返回 N，否则返回 null */
export function getLastNDaysExcludeTodayFromRange(
  start: Date | null,
  end: Date | null,
): number | null {
  if (!start || !end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (!isSameDay(end, yesterday)) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const expectedStart = new Date(yesterday);
  expectedStart.setDate(expectedStart.getDate() - (days - 1));
  if (!isSameDay(start, expectedStart)) return null;
  return days > 0 ? days : null;
}

/** 快捷周期：返回 [start, end]。lastN / lastNExcludeToday 时需传入 n（大于 0 的整数） */
export function getPresetRange(
  key: 'custom' | 'today' | 'yesterday' | 'last7' | 'last30' | 'lastN' | 'lastNExcludeToday',
  n?: number,
): [Date, Date] {
  if (key === 'custom') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [new Date(today), new Date(today)];
  }
  if (key === 'lastN') return getLastNDaysRange(n ?? 7);
  if (key === 'lastNExcludeToday') return getLastNDaysRangeExcludeToday(n ?? 7);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let start: Date;
  let end: Date;
  switch (key) {
    case 'today':
      start = new Date(today);
      end = new Date(today);
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = new Date(start);
      break;
    case 'last7':
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 6);
      break;
    case 'last30':
      end = new Date(today);
      start = new Date(today);
      start.setDate(start.getDate() - 29);
      break;
    default:
      start = end = new Date(today);
  }
  return [start, end];
}
