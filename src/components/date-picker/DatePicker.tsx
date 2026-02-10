import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DatePickerProps, DateRange, PresetKey } from "./types";
import {
  formatDateForInput,
  getCalendarWeeks,
  getDaysInMonth,
  getLastNDaysExcludeTodayFromRange,
  getLastNDaysFromRange,
  getLastNDaysRange,
  getLastNDaysRangeExcludeToday,
  getMonthStartWeekday,
  getPresetRange,
  isInRange,
  isRangeEnd,
  isRangeStart,
  isSameDay,
  parseDateInput,
} from "./utils";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "custom", label: "自定义" },
  { key: "today", label: "今天" },
  { key: "yesterday", label: "昨天" },
  { key: "last7", label: "最近7天" },
  { key: "last30", label: "最近30天" },
  { key: "lastN", label: "过去【N】天（含今天）" },
  { key: "lastNExcludeToday", label: "过去【N】天（截止昨天）" },
];

function ArrowLeft(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M15 18L9 12L15 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M9 18L15 12L9 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DatePicker(props: DatePickerProps) {
  const {
    value = [null, null],
    onChange,
    className,
    disabledDate,
    yearRange = [1970, new Date().getFullYear() + 50],
  } = props;
  const [start, end] = value;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewYear, setViewYear] = useState(() =>
    start ? start.getFullYear() : today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(() =>
    start ? start.getMonth() + 1 : today.getMonth() + 1,
  );
  /** 过去N天（含今天）的 N 输入 */
  const [pastNInput, setPastNInput] = useState("7");
  /** 过去N天（截止昨天）的 N 输入 */
  const [pastNExcludeTodayInput, setPastNExcludeTodayInput] = useState("7");
  /** 顶部开始/结束日期输入框的本地文案（与 value 同步，支持手动输入） */
  const [startInputValue, setStartInputValue] = useState("");
  const [endInputValue, setEndInputValue] = useState("");
  /** 年选择框是否展开 */
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);

  // 从 value 同步到顶部输入框
  useEffect(() => {
    setStartInputValue(start ? formatDateForInput(start) : "");
    setEndInputValue(end ? formatDateForInput(end) : "");
  }, [start, end]);

  const handlePreset = useCallback(
    (key: PresetKey) => {
      if (key === "custom") return;
      if (key === "lastN" || key === "lastNExcludeToday") return; // 由下方 N 输入框应用
      const [s, e] = getPresetRange(key);
      onChange?.([s, e]);
      setViewYear(s.getFullYear());
      setViewMonth(s.getMonth() + 1);
    },
    [onChange],
  );

  const handlePastNApply = useCallback(
    (n: number) => {
      const num = Math.max(1, Math.floor(n));
      const [s, e] = getLastNDaysRange(num);
      onChange?.([s, e]);
      setViewYear(s.getFullYear());
      setViewMonth(s.getMonth() + 1);
      setPastNInput(String(num));
    },
    [onChange],
  );

  const handlePastNExcludeTodayApply = useCallback(
    (n: number) => {
      const num = Math.max(1, Math.floor(n));
      const [s, e] = getLastNDaysRangeExcludeToday(num);
      onChange?.([s, e]);
      setViewYear(s.getFullYear());
      setViewMonth(s.getMonth() + 1);
      setPastNExcludeTodayInput(String(num));
    },
    [onChange],
  );

  const handlePrevMonth = useCallback(() => {
    if (viewMonth <= 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const handleNextMonth = useCallback(() => {
    if (viewMonth >= 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const handleDayClick = useCallback(
    (d: Date) => {
      if (disabledDate?.(d)) return;
      const [s, e] = value;
      if (!s || (s && e)) {
        onChange?.([d, null]);
        return;
      }
      if (d.getTime() < s.getTime()) {
        onChange?.([d, s]);
      } else {
        onChange?.([s, d]);
      }
    },
    [value, onChange, disabledDate],
  );

  /** 从开始日期输入框提交：解析并更新 value，仅改开始日期 */
  const applyStartInput = useCallback(() => {
    const d = parseDateInput(startInputValue);
    if (!d) return;
    const [s, e] = value;
    if (e && d.getTime() > e.getTime()) {
      onChange?.([d, d]);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    } else {
      onChange?.([d, e ?? d]);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    }
  }, [startInputValue, value, onChange]);

  /** 从结束日期输入框提交：解析并更新 value，仅改结束日期 */
  const applyEndInput = useCallback(() => {
    const d = parseDateInput(endInputValue);
    if (!d) return;
    const [s, e] = value;
    if (s && d.getTime() < s.getTime()) {
      onChange?.([s, d]);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    } else {
      onChange?.([s ?? d, d]);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    }
  }, [endInputValue, value, onChange]);

  /** 点击外部关闭年选择框 */
  useEffect(() => {
    if (!yearPickerOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        yearPickerRef.current &&
        !yearPickerRef.current.contains(e.target as Node)
      ) {
        setYearPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [yearPickerOpen]);

  // 年份弹窗打开时，将当前选择年份滚动到可视区域中间
  useEffect(() => {
    if (!yearPickerOpen || !yearPickerRef.current) return;
    const container = yearPickerRef.current.querySelector(
      ".year-picker-scroll",
    ) as HTMLDivElement | null;
    if (!container) return;
    const currentYearButton = container.querySelector<HTMLButtonElement>(
      `button[data-year="${viewYear}"]`,
    );
    if (!currentYearButton) return;
    currentYearButton.scrollIntoView({
      block: "center",
      behavior: "auto",
    });
  }, [yearPickerOpen, viewYear]);

  const yearOptions = useMemo(() => {
    const [startYear, endYear] = yearRange;
    const list: number[] = [];
    for (let y = startYear; y <= endYear; y++) list.push(y);
    return list;
  }, [yearRange]);

  const weeks = getCalendarWeeks(viewYear, viewMonth);
  const startOffset = getMonthStartWeekday(viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);

  const gridDays = useMemo(() => {
    const list: { date: Date; isCurrent: boolean }[] = [];
    const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
    const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
    const prevDays = getDaysInMonth(prevYear, prevMonth);
    for (let i = 0; i < startOffset; i++) {
      const day = prevDays - startOffset + 1 + i;
      list.push({
        date: new Date(prevYear, prevMonth - 1, day),
        isCurrent: false,
      });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      list.push({
        date: new Date(viewYear, viewMonth - 1, day),
        isCurrent: true,
      });
    }
    const rest = 7 * weeks - list.length;
    for (let day = 1; day <= rest; day++) {
      const nextMonth = viewMonth === 12 ? 1 : viewMonth + 1;
      const nextYear = viewMonth === 12 ? viewYear + 1 : viewYear;
      list.push({
        date: new Date(nextYear, nextMonth - 1, day),
        isCurrent: false,
      });
    }
    return list;
  }, [viewYear, viewMonth, weeks, startOffset, daysInMonth]);

  const activePreset: PresetKey | null = useMemo(() => {
    if (!start || !end) return "custom";
    // 按 key 匹配：对每个预设用 getPresetRange(key) 得到范围并比较
    for (const { key } of PRESETS) {
      if (key === "custom") continue;
      if (key === "lastN") {
        const n = getLastNDaysFromRange(start, end);
        if (n == null) continue;
        const [s, e] = getPresetRange("lastN", n);
        if (isSameDay(s, start) && isSameDay(e, end)) return "lastN";
        continue;
      }
      if (key === "lastNExcludeToday") {
        const n = getLastNDaysExcludeTodayFromRange(start, end);
        if (n == null) continue;
        const [s, e] = getPresetRange("lastNExcludeToday", n);
        if (isSameDay(s, start) && isSameDay(e, end))
          return "lastNExcludeToday";
        continue;
      }
      const [s, e] = getPresetRange(key);
      if (isSameDay(s, start) && isSameDay(e, end)) return key;
    }
    return "custom";
  }, [start, end]);

  const lastNDaysValue = useMemo(() => {
    if (!start || !end) return null;
    return getLastNDaysFromRange(start, end);
  }, [start, end]);

  const lastNDaysExcludeTodayValue = useMemo(() => {
    if (!start || !end) return null;
    return getLastNDaysExcludeTodayFromRange(start, end);
  }, [start, end]);

  // 仅当高亮为对应项时才同步输入框，避免选其他预设时改 N
  useEffect(() => {
    if (activePreset === "lastN" && lastNDaysValue != null)
      setPastNInput(String(lastNDaysValue));
  }, [activePreset, lastNDaysValue]);
  useEffect(() => {
    if (
      activePreset === "lastNExcludeToday" &&
      lastNDaysExcludeTodayValue != null
    )
      setPastNExcludeTodayInput(String(lastNDaysExcludeTodayValue));
  }, [activePreset, lastNDaysExcludeTodayValue]);

  return (
    <div
      className={`flex flex-row w-fit rounded-2xl shadow-md overflow-hidden ${className ?? ""}`.trim()}
    >
      {/* Time Filter - 左侧快捷周期：仅选中项有 bg-50；默认自定义，过去N天可输入 N */}
      <div className="flex flex-col gap-2 py-5 px-4 pt-5 pb-0.5 w-[200px] min-h-[364px] bg-white border-r border-slate-200">
        {PRESETS.map(({ key, label }) => {
          if (key === "lastN") {
            const isActive = activePreset === "lastN";
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("input")) return;
                  const n = parseInt(pastNInput, 10);
                  handlePastNApply(Number.isInteger(n) && n > 0 ? n : 1);
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !(e.target as HTMLElement).closest("input")
                  ) {
                    const n = parseInt(pastNInput, 10);
                    handlePastNApply(Number.isInteger(n) && n > 0 ? n : 1);
                  }
                }}
                className={`flex items-center gap-1.5 py-2 pl-3 pr-2 w-[168px] rounded-xl cursor-pointer ${
                  isActive ? "bg-50" : ""
                }`}
              >
                <span className="font-medium text-sm text-slate-900 whitespace-nowrap">
                  过去
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={pastNInput}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setPastNInput(v || "1");
                  }}
                  onBlur={() => {
                    const n = parseInt(pastNInput, 10);
                    if (Number.isInteger(n) && n > 0) handlePastNApply(n);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(pastNInput, 10);
                      if (Number.isInteger(n) && n > 0) handlePastNApply(n);
                    }
                  }}
                  className="w-11 h-8 px-1.5 text-center text-sm font-medium text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="font-medium text-sm text-slate-900">
                  天（含今天）
                </span>
              </div>
            );
          }
          if (key === "lastNExcludeToday") {
            const isActive = activePreset === "lastNExcludeToday";
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("input")) return;
                  const n = parseInt(pastNExcludeTodayInput, 10);
                  handlePastNExcludeTodayApply(
                    Number.isInteger(n) && n > 0 ? n : 1,
                  );
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !(e.target as HTMLElement).closest("input")
                  ) {
                    const n = parseInt(pastNExcludeTodayInput, 10);
                    handlePastNExcludeTodayApply(
                      Number.isInteger(n) && n > 0 ? n : 1,
                    );
                  }
                }}
                className={`flex items-center gap-1.5 py-2 pl-3 pr-2 w-[168px] rounded-xl cursor-pointer ${
                  isActive ? "bg-50" : ""
                }`}
              >
                <span className="font-medium text-sm text-slate-900 whitespace-nowrap">
                  过去
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={pastNExcludeTodayInput}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setPastNExcludeTodayInput(v || "1");
                  }}
                  onBlur={() => {
                    const n = parseInt(pastNExcludeTodayInput, 10);
                    if (Number.isInteger(n) && n > 0)
                      handlePastNExcludeTodayApply(n);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(pastNExcludeTodayInput, 10);
                      if (Number.isInteger(n) && n > 0)
                        handlePastNExcludeTodayApply(n);
                    }
                  }}
                  className="w-11 h-8 px-1.5 text-center text-sm font-medium text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="font-medium text-sm text-slate-900">
                  天（截止昨天）
                </span>
              </div>
            );
          }
          return (
            <button
              key={key}
              type="button"
              onClick={() => handlePreset(key)}
              className={`flex items-center gap-2 py-2 pl-3 pr-2 w-[168px] border-0 cursor-pointer font-medium text-sm text-slate-900 rounded-xl ${
                activePreset === key ? "bg-50" : ""
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Date - 右侧日历 */}
      <div className="flex flex-col gap-3 p-5 w-[368px] bg-white">
        {/* 顶部：开始日期 - 结束日期，左右布局，中间横线 */}
        <div className="flex flex-row items-end gap-2 w-full">
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs text-slate-500 mb-1 block">
              开始日期
            </label>
            <input
              type="text"
              value={startInputValue}
              onChange={(e) => setStartInputValue(e.target.value)}
              onBlur={applyStartInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyStartInput();
              }}
              placeholder="YYYY/MM/DD"
              className="w-full h-9 px-2.5 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <span className="text-slate-400 pb-2.5 shrink-0">-</span>
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-xs text-slate-500 mb-1 block">
              结束日期
            </label>
            <input
              type="text"
              value={endInputValue}
              onChange={(e) => setEndInputValue(e.target.value)}
              onBlur={applyEndInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyEndInput();
              }}
              placeholder="YYYY/MM/DD"
              className="w-full h-9 px-2.5 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* 年月切换：点击弹出年选择框(1970+)，左右箭头切换月 */}
        <div
          className="relative flex flex-row justify-between items-center self-stretch gap-2.5 px-1.5 py-1.5 rounded-xl bg-50"
          ref={yearPickerRef}
        >
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex items-center justify-center w-10 h-10 border-0 bg-transparent text-slate-600 cursor-pointer rounded-md hover:bg-white/60"
          >
            <ArrowLeft />
          </button>
          <button
            type="button"
            onClick={() => setYearPickerOpen((v) => !v)}
            className="flex items-center justify-center gap-1 font-medium text-sm text-slate-600 cursor-pointer hover:text-slate-900 min-w-[100px]"
          >
            <span>
              {viewYear}年 {viewMonth}月
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path d="M10 12.25L5.5 7.75H14.5L10 12.25Z" fill="#45556C" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex items-center justify-center w-10 h-10 border-0 bg-transparent text-slate-600 cursor-pointer rounded-md hover:bg-white/60"
          >
            <ArrowRight />
          </button>
          {yearPickerOpen && (
            <div className="absolute left-1/2 top-full mt-1 -translate-x-1/2 z-20 w-48 max-h-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              <div className="year-picker-scroll max-h-56 overflow-y-auto pb-2 px-2">
                <div className="sticky top-0 z-10 text-xs text-slate-400 px-2 py-1 bg-white">
                  选择年份
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      data-year={y}
                      onClick={() => {
                        setViewYear(y);
                        setYearPickerOpen(false);
                      }}
                      className={`py-1.5 text-sm rounded-lg ${
                        viewYear === y
                          ? "bg-primary text-white"
                          : "text-slate-600 hover:bg-50"
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 星期头：7 列网格，与上方输入框右侧对齐 */}
        <div className="grid grid-cols-7 w-full">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="h-10 flex items-center justify-center font-medium text-sm text-slate-400"
            >
              {wd}
            </div>
          ))}
        </div>

        {/* 日期格子：7 列网格，一行 7 个，与星期对齐；行间距 py-2 */}
        <div className="grid grid-cols-7 w-full rounded-xl gap-y-2 py-2">
          {gridDays.map(({ date, isCurrent }, idx) => {
            const isDisabled = disabledDate?.(date) ?? false;
            const inRange = isInRange(date, start, end);
            const isStart = isRangeStart(date, start, end);
            const isEnd = isRangeEnd(date, start, end);
            const isSelected = isStart || isEnd;
            const isOtherMonth = !isCurrent;

            const bgClass =
              isDisabled && !isSelected
                ? "bg-transparent"
                : isSelected
                  ? "bg-primary"
                  : "bg-transparent";
            const textClass =
              isDisabled && !isSelected
                ? "text-slate-300"
                : isSelected
                  ? "text-white"
                  : inRange
                    ? "text-primary"
                    : isOtherMonth
                      ? "text-slate-400"
                      : "text-slate-600";
            // 连续范围：仅起点/终点圆角，中间无圆角避免背景空缺
            const roundClass =
              isStart && isEnd
                ? "rounded-xl"
                : isStart
                  ? "rounded-xl"
                  : isEnd
                    ? "rounded-xl"
                    : inRange
                      ? "rounded-none"
                      : "rounded-xl";

            const hoverClass = isSelected || isDisabled ? "" : "hover:bg-50";

            return (
              <div
                key={idx}
                className={`relative h-10 flex items-center justify-center ${isOtherMonth ? "opacity-60" : ""}`}
              >
                {inRange && (
                  <div
                    className={`absolute inset-y-0 bg-primary-50 ${
                      isStart && isEnd
                        ? "left-[calc(50%-20px)] right-[calc(50%-20px)] rounded-xl"
                        : isStart
                          ? "left-[calc(50%-20px)] right-0 rounded-l-xl"
                          : isEnd
                            ? "left-0 right-[calc(50%-20px)] rounded-r-xl"
                            : "left-0 right-0"
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleDayClick(date)}
                  disabled={isDisabled}
                  className={`relative z-10 w-10 h-10 flex items-center justify-center border-0 font-medium text-sm ${roundClass} ${bgClass} ${textClass} ${hoverClass} ${
                    isDisabled
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer"
                  } ${isOtherMonth ? "opacity-60" : ""}`}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
