import React, { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HOVER_DELAY_MS = 120;
const GAP = 6;
const VIEWPORT_MARGIN = 8;
/** 用于判断是否翻转的估算尺寸，避免被视口裁切 */
const ESTIMATED_TOOLTIP_HEIGHT = 40;
const ESTIMATED_TOOLTIP_WIDTH = 220;

export interface TooltipProps {
  /** hover 时显示的文案 */
  title: React.ReactNode;
  /** 触发元素 */
  children: React.ReactNode;
  /** 期望位置，默认上方；空间不足时会自动翻转到另一侧 */
  placement?: "top" | "bottom";
  /** 自定义类名，作用于触发器包裹层 */
  className?: string;
}

/**
 * 统一风格的 hover 提示，与表格/筛选条等组件视觉一致。
 * 默认在触发元素上方弹出，若上方空间不足则自动显示在下方；水平方向会限制在视口内。
 */
export function Tooltip({
  title,
  children,
  placement = "top",
  className,
}: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    effectivePlacement: "top" | "bottom";
  } | null>(null);
  const delayRef = useRef<number | null>(null);

  const updatePosition = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN;
    const needTop = ESTIMATED_TOOLTIP_HEIGHT + GAP;
    const needBottom = ESTIMATED_TOOLTIP_HEIGHT + GAP;

    const useTop =
      placement === "top"
        ? spaceAbove >= needTop || spaceAbove >= spaceBelow
        : spaceBelow < needBottom && spaceAbove >= needTop;

    const top = useTop
      ? rect.top - GAP
      : rect.bottom + GAP;
    let left = rect.left + rect.width / 2;
    const halfW = ESTIMATED_TOOLTIP_WIDTH / 2;
    left = Math.max(
      VIEWPORT_MARGIN + halfW,
      Math.min(vw - VIEWPORT_MARGIN - halfW, left),
    );

    setPosition({
      top,
      left,
      effectivePlacement: useTop ? "top" : "bottom",
    });
  }, [placement]);

  const show = useCallback(() => {
    if (delayRef.current != null) window.clearTimeout(delayRef.current);
    delayRef.current = window.setTimeout(() => {
      delayRef.current = null;
      updatePosition();
      setVisible(true);
    }, HOVER_DELAY_MS);
  }, [updatePosition]);

  const hide = useCallback(() => {
    if (delayRef.current != null) {
      window.clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    setVisible(false);
    setPosition(null);
  }, []);

  const tooltipEl =
    visible &&
    position &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        role="tooltip"
        className="pointer-events-none fixed z-[100] whitespace-nowrap rounded-lg border border-200 bg-0 px-2.5 py-1.5 text-sm text-950 shadow-lg"
        style={{
          left: position.left,
          top: position.top,
          transform:
            position.effectivePlacement === "top"
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
        }}
      >
        {title}
      </div>,
      document.body,
    );

  return (
    <span
      ref={wrapperRef}
      className={`inline-block ${className ?? ""}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {tooltipEl}
    </span>
  );
}
