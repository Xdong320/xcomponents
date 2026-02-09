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
    className="shrink-0 text-600"
  >
    <path
      d="M9.20431 9.99923L12.9168 13.7117L11.8563 14.7722L7.08331 9.99923L11.8563 5.22623L12.9168 6.28673L9.20431 9.99923Z"
      fill="currentColor"
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
      fill="currentColor"
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

  return (
    <div className="flex w-full items-center justify-between gap-2 py-4 [column-gap:8px]">
      <div className="flex-1" />
      <div className="flex items-center [column-gap:8px]">
        <button
          type="button"
          aria-label="上一页"
          disabled={current <= 1}
          onClick={() => onChange(current - 1, pageSize)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-600 transition-colors disabled:opacity-40 hover:bg-100"
        >
          <ArrowLeftIcon />
        </button>
        <div className="flex items-center [column-gap:8px]">
          {pageItems.map((item, i) =>
            item === "ellipsis" ? (
              <span
                key={`e-${i}`}
                className="flex h-8 w-8 items-center justify-center text-xs font-medium text-600"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onChange(item, pageSize)}
                className={`flex h-8 min-w-[32px] items-center justify-center rounded-full px-2 text-xs font-medium text-600 transition-colors hover:bg-100 ${item === current ? "bg-100" : ""}`}
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
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-600 transition-colors disabled:opacity-40 hover:bg-100"
        >
          <ArrowRightIcon />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-end">
        <select
          value={pageSize}
          onChange={(e) => {
            onChange(1, Number(e.target.value));
          }}
          className="cursor-pointer appearance-auto rounded-lg border border-200 bg-0 py-1.5 pl-2.5 pr-1.5 text-xs text-sub-600 shadow-small outline-none"
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
