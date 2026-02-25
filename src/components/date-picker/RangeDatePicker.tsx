import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DateRange, Placement, RangeDatePickerProps } from "./types";
import { formatDateForInput } from "./utils";
import { DatePicker } from "./DatePicker";

const GAP = 8;
const VIEWPORT_MARGIN = 8;

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6 2V4M14 2V4M3 8H17M4 4H16C16.5523 4 17 4.44772 17 5V16C17 16.5523 16.5523 17 16 17H4C3.44772 17 3 16.5523 3 16V5C3 4.44772 3.44772 4 4 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6 12L10 8L6 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RangeDatePicker(props: RangeDatePickerProps) {
  const {
    value = [null, null],
    onChange,
    placeholder = ["开始日期", "结束日期"],
    placement: placementProp = "bottomLeft",
    disabled = false,
    disabledDate,
    className,
    yearRange,
    border = true,
  } = props;

  const [open, setOpen] = useState(false);
  const [resolvedPosition, setResolvedPosition] = useState({ top: 0, left: 0 });
  const [positionReady, setPositionReady] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [start, end] = value;
  const displayStart = start ? formatDateForInput(start) : placeholder[0];
  const displayEnd = end ? formatDateForInput(end) : placeholder[1];

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const popoverRect = popover?.getBoundingClientRect() ?? {
      width: 400,
      height: 420,
      top: 0,
      left: 0,
    };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const placement = placementProp;

    const positions = {
      topLeft: {
        top: triggerRect.top - popoverRect.height - GAP,
        left: triggerRect.left,
      },
      topRight: {
        top: triggerRect.top - popoverRect.height - GAP,
        left: triggerRect.right - popoverRect.width,
      },
      bottomLeft: {
        top: triggerRect.bottom + GAP,
        left: triggerRect.left,
      },
      bottomRight: {
        top: triggerRect.bottom + GAP,
        left: triggerRect.right - popoverRect.width,
      },
    };

    let { top, left } = positions[placement];

    // 边界：限制在视口内，避免被遮挡
    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = vw - popoverRect.width - VIEWPORT_MARGIN;
    const minTop = VIEWPORT_MARGIN;
    const maxTop = vh - popoverRect.height - VIEWPORT_MARGIN;

    left = Math.min(Math.max(left, minLeft), maxLeft);
    top = Math.min(Math.max(top, minTop), maxTop);

    setResolvedPosition({ top, left });
    setPositionReady(true);
  }, [placementProp, open]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      setPositionReady(false);
      return;
    }
    const observer = new ResizeObserver(updatePosition);
    const popover = popoverRef.current;
    if (popover) observer.observe(popover);
    return () => observer.disconnect();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updatePosition]);

  const handleChange = useCallback(
    (range: DateRange) => {
      onChange?.(range);
      setOpen(false);
    },
    [onChange],
  );

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (
      trigger?.contains(e.target as Node) ||
      popover?.contains(e.target as Node)
    )
      return;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  const triggerContent = useMemo(
    () => (
      <>
        <span className="text-slate-400 shrink-0 mr-1">
          <CalendarIcon />
        </span>
        <span
          className={
            start ? "text-slate-900 text-sm" : "text-slate-400 text-sm"
          }
        >
          {displayStart}
        </span>
        <span className="text-slate-300 shrink-0" aria-hidden>
          {/* <ArrowRightIcon /> */}-
        </span>
        <span
          className={end ? "text-slate-900 text-sm" : "text-slate-400 text-sm"}
        >
          {displayEnd}
        </span>
      </>
    ),
    [start, end, displayStart, displayEnd],
  );

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setOpen((v) => !v);
          }
        }}
        className={`flex items-center gap-2 w-full min-w-[280px] h-10 px-3 py-2 rounded-lg bg-white cursor-pointer outline-none focus:ring-2 focus:ring-primary ${
          border ? "border border-slate-200 focus:border-transparent" : "border-0"
        } ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-50"
            : border
              ? "hover:border-slate-300"
              : ""
        } ${className ?? ""}`.trim()}
      >
        {triggerContent}
      </div>

      {open && (
        <div
          ref={popoverRef}
          className="fixed z-[9999] w-fit"
          style={{
            top: resolvedPosition.top,
            left: resolvedPosition.left,
            visibility: positionReady ? "visible" : "hidden",
          }}
          role="dialog"
          aria-label="选择日期范围"
        >
          <DatePicker
            value={value}
            onChange={handleChange}
            onCancel={() => setOpen(false)}
            disabledDate={disabledDate}
            yearRange={yearRange}
          />
        </div>
      )}
    </div>
  );
}
