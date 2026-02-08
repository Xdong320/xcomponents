import React, { useMemo } from "react";
import type { PaginationRenderProps } from "./types";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M9.20431 9.99923L12.9168 13.7117L11.8563 14.7722L7.08331 9.99923L11.8563 5.22623L12.9168 6.28673L9.20431 9.99923Z"
      fill="#45556C"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    className="shrink-0"
  >
    <path
      d="M10.7958 9.99923L7.08331 6.28673L8.14381 5.22623L12.9168 9.99923L8.14381 14.7722L7.08331 13.7117L10.7958 9.99923Z"
      fill="#45556C"
    />
  </svg>
);

/** 生成带省略号的页码列表，如 [1, 2, 3, 4, 5, 'ellipsis', 10] */
function getPageItems(
  current: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [];
  const showLeft = current <= 4;
  const showRight = current >= totalPages - 3;
  if (showLeft) {
    for (let i = 1; i <= 5; i++) items.push(i);
    items.push("ellipsis", totalPages);
  } else if (showRight) {
    items.push(1, "ellipsis");
    for (let i = totalPages - 4; i <= totalPages; i++) items.push(i);
  } else {
    items.push(
      1,
      "ellipsis",
      current - 1,
      current,
      current + 1,
      "ellipsis",
      totalPages,
    );
  }
  return items;
}

export interface TablePaginationProps {
  /** 当前页（从 1 开始） */
  current: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 页码或每页条数变更 */
  onChange: (page: number, pageSize: number) => void;
  /** 自定义分页 UI；传入时不再渲染默认分页栏 */
  customRender?: (props: PaginationRenderProps) => React.ReactNode;
  /** 每页条数可选值，默认 [10, 20, 50, 100] */
  pageSizeOptions?: number[];
}

export function TablePagination({
  current,
  pageSize,
  total,
  totalPages,
  onChange,
  customRender,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: TablePaginationProps) {
  const pageItems = useMemo(
    () => getPageItems(current, totalPages),
    [current, totalPages],
  );

  if (typeof customRender === "function") {
    return (
      <>
        {customRender({
          current,
          pageSize,
          total,
          totalPages,
          onChange,
        })}
      </>
    );
  }

  // Figma 设计规范：Pagination Group [1.0]（会话洞察）
  const figma = {
    text: "#45556C", // fill_YI4X1K Label/Small
    activeBg: "#F5F7FA", // fill_T405WY
    dropdownBorder: "#E1E4EA", // stroke_QRJPF4
    dropdownText: "#525866", // fill_XX9VQ7 Paragraph/Small
    dropdownShadow: "0px 1px 2px 0px rgba(10, 13, 20, 0.03)",
  };

  return (
    <div
      className="flex py-4 w-full items-center justify-between gap-2"
      style={{ gap: 8 }}
    >
      {/* 左侧占位，使中间页码组整体居中 */}
      <div className="flex-1" />
      {/* 中间：上一页 + 页码 + 下一页，gap 8px */}
      <div className="flex items-center" style={{ gap: 8 }}>
        <button
          type="button"
          aria-label="上一页"
          disabled={current <= 1}
          onClick={() => onChange(current - 1, pageSize)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] transition-colors disabled:opacity-40 hover:bg-[#F5F7FA]"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex items-center" style={{ gap: 8 }}>
          {pageItems.map((item, i) =>
            item === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="flex h-8 w-8 items-center justify-center text-xs font-medium"
                style={{ color: figma.text }}
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onChange(item, pageSize)}
                className="flex h-8 min-w-[32px] items-center justify-center rounded-full px-2 text-xs font-medium transition-colors hover:bg-[#F5F7FA]"
                style={{
                  backgroundColor:
                    item === current ? figma.activeBg : undefined,
                  color: figma.text,
                }}
              >
                {item}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          aria-label="下一页"
          disabled={current >= totalPages}
          onClick={() => onChange(current + 1, pageSize)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] transition-colors disabled:opacity-40 hover:bg-[#F5F7FA]"
        >
          <ArrowRightIcon />
        </button>
      </div>
      {/* 右侧：每页条数选择器 Compact Dropdowns - padding 6 10 6 6, border 1px, radius 8px */}
      <div className="flex flex-1 items-center justify-end">
        <select
          value={pageSize}
          onChange={(e) => {
            onChange(1, Number(e.target.value));
          }}
          className="cursor-pointer appearance-auto rounded-lg border bg-white text-xs outline-none"
          style={{
            color: figma.dropdownText,
            borderColor: figma.dropdownBorder,
            boxShadow: figma.dropdownShadow,
            padding: "6px 6px 6px 10px",
          }}
        >
          {pageSizeOptions.map((n) => (
            <option key={n} value={n}>
              {n}条 / 页
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
