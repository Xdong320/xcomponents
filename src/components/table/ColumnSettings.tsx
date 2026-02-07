import React from 'react';
import type { ColumnSettingsProps } from './types';

interface InternalColumnSettingsProps<T = any>
  extends ColumnSettingsProps<T> {
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
      className={`w-56 rounded-figma-table border border-figma-border bg-figma-surface p-2 text-figma-paragraph shadow-figma-small transition-opacity duration-200 ${className ?? ''}`}
    >
      <div className="mb-2 flex items-center justify-between text-figma-label-sm text-figma-text-secondary">
        <span className="font-medium text-figma-text-primary">列设置</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleSelectAll}
            className="rounded-figma-tag px-2 py-0.5 text-figma-paragraph text-figma-text-secondary hover:bg-figma-surface-alt"
          >
            全选
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-figma-tag px-2 py-0.5 text-figma-paragraph text-figma-text-secondary hover:bg-figma-surface-alt"
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
              className="flex cursor-pointer items-center gap-2 rounded-figma-tag px-2 py-1.5 text-figma-paragraph text-figma-text-primary hover:bg-figma-surface-alt"
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-figma-border text-figma-primary"
                checked={checked}
                onChange={() => toggleKey(key)}
              />
              <span className="truncate">
                {col.title as any}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

