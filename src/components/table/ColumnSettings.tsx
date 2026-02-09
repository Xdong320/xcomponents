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
        <div className="flex gap-1">
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
        </div>
      </div>
      <div className="max-h-56 space-y-0.5 overflow-auto">
        {allColumns.map((col, index) => {
          const key = col.key ?? col.dataIndex ?? index;
          if (key === undefined) return null;
          const checked = visibleKeys.includes(key);
          return (
            <label
              key={key.toString()}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-950 hover:bg-100"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-200 text-primary"
                checked={checked}
                onChange={() => toggleKey(key)}
              />
              <span className="truncate">{col.title as any}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
