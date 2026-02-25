import React from "react";
import type { ColumnSettingsProps } from "./types";

interface InternalColumnSettingsProps<T = any> extends ColumnSettingsProps<T> {
  className?: string;
}

export function ColumnSettings<T = any>({
  allColumns,
  visibleKeys,
  onChange,
  className,
}: InternalColumnSettingsProps<T>) {
  const toggleKey = (key: React.Key) => {
    const set = new Set(visibleKeys);
    if (set.has(key)) {
      set.delete(key);
    } else {
      set.add(key);
    }
    onChange(Array.from(set));
  };

  const handleSelectAll = () => {
    onChange(
      allColumns
        .map((c, index) => c.key ?? c.dataIndex ?? index)
        .filter((k) => k !== undefined) as React.Key[],
    );
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <div
      className={`w-56 rounded-xl border border-200 bg-0 p-2 text-sm shadow-lg transition-opacity duration-200 ${className ?? ""}`}
    >
      <div className="mb-2 flex items-center justify-between text-sm font-medium text-600">
        <span className="font-medium text-950">列设置</span>
        {/* <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSelectAll}
            className="rounded-lg px-2 py-0.5 text-sm text-600 hover:bg-100"
          >
            全选
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg px-2 py-0.5 text-sm text-600 hover:bg-100"
          >
            清空
          </button>
        </div> */}
      </div>
      <div className="max-h-56 space-y-0.5 overflow-auto">
        {allColumns.map((col, index) => {
          const key = col.key ?? col.dataIndex ?? index;
          if (key === undefined) return null;
          const checked = visibleKeys.includes(key);
          return (
            <button
              key={key.toString()}
              type="button"
              onClick={() => toggleKey(key)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-950 hover:bg-100"
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded border border-200 text-white ${
                  checked ? "bg-primary" : "bg-0"
                }`}
                aria-hidden="true"
              >
                {checked && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="16"
                      height="16"
                      rx="4"
                      fill="#7F58EA"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M14.5304 8.03039L9.00006 13.5607L5.46973 10.0304L6.53039 8.96973L9.00006 11.4394L13.4697 6.96973L14.5304 8.03039Z"
                      fill="white"
                    />
                  </svg>
                )}
              </span>
              <span className="truncate">{col.title as any}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
