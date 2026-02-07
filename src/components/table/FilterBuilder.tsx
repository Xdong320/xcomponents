import React, { useEffect, useMemo, useState } from "react";
import type {
  FilterBuilderProps,
  FilterCondition,
  FilterFieldMeta,
} from "./types";

function buildStorageKey(id: string) {
  return `filter_builder_${id}`;
}

function loadSavedConditions(id: string): FilterCondition[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(buildStorageKey(id));
    if (!raw) return null;
    return JSON.parse(raw) as FilterCondition[];
  } catch {
    return null;
  }
}

function saveConditions(id: string, conditions: FilterCondition[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      buildStorageKey(id),
      JSON.stringify(conditions),
    );
  } catch {
    // ignore
  }
}

function createEmptyCondition(fieldMeta: FilterFieldMeta): FilterCondition {
  const defaultOperator =
    fieldMeta.operators && fieldMeta.operators.length > 0
      ? fieldMeta.operators[0]
      : "=";

  return {
    field: fieldMeta.field,
    label: fieldMeta.label,
    type: fieldMeta.type,
    operator: defaultOperator,
    value: undefined,
  };
}

interface FilterBuilderInternalProps extends FilterBuilderProps {
  className?: string;
}

function defaultTagLabel(c: FilterCondition): string {
  const value = c.value === undefined || c.value === "" ? "" : String(c.value);
  return value
    ? `${c.label} ${c.operator} ${value}`
    : `${c.label} ${c.operator}`;
}

export const FilterBuilder: React.FC<FilterBuilderInternalProps> = ({
  id,
  fields,
  value,
  onChange,
  className,
  variant = "bar",
  formatConditionLabel = defaultTagLabel,
}) => {
  const [conditions, setConditions] = useState<FilterCondition[]>(() => {
    if (value && value.length > 0) return value;
    const saved = loadSavedConditions(id);
    return saved ?? [];
  });

  useEffect(() => {
    if (value) {
      setConditions(value);
    }
  }, [value]);

  const availableFields = useMemo(
    () => fields.filter((f) => !conditions.some((c) => c.field === f.field)),
    [fields, conditions],
  );

  const handleApply = () => {
    onChange?.(conditions);
  };

  const handleSave = () => {
    saveConditions(id, conditions);
  };

  const handleLoadSaved = () => {
    const saved = loadSavedConditions(id);
    if (saved) {
      setConditions(saved);
      onChange?.(saved);
    }
  };

  const updateCondition = (index: number, patch: Partial<FilterCondition>) => {
    setConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeCondition = (index: number) => {
    setConditions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onChange?.(next);
      return next;
    });
  };

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<FilterCondition | null>(null);

  const handleAddField = (fieldName: string) => {
    const meta = fields.find((f) => f.field === fieldName);
    if (!meta) return;
    setEditing(createEmptyCondition(meta));
    setAddOpen(false);
  };

  const commitEditing = () => {
    if (!editing) return;
    setConditions((prev) => {
      const next = [...prev, editing];
      onChange?.(next);
      return next;
    });
    setEditing(null);
  };

  const renderValueInput = (
    condition: FilterCondition,
    index: number,
  ): React.ReactNode => {
    switch (condition.type) {
      case "number":
        return (
          <input
            type="number"
            value={condition.value ?? ""}
            onChange={(e) =>
              updateCondition(index, {
                value:
                  e.target.value === "" ? undefined : Number(e.target.value),
              })
            }
            className="h-8 w-32 rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-500"
          />
        );
      case "select": {
        const meta = fields.find((f) => f.field === condition.field);
        return (
          <select
            value={condition.value ?? ""}
            onChange={(e) =>
              updateCondition(index, {
                value: e.target.value === "" ? undefined : e.target.value,
              })
            }
            className="h-8 w-32 rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-500"
          >
            <option value="">请选择</option>
            {meta?.options?.map((opt) => (
              <option key={String(opt.value)} value={opt.value as any}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }
      case "boolean":
        return (
          <select
            value={
              typeof condition.value === "boolean"
                ? String(condition.value)
                : ""
            }
            onChange={(e) =>
              updateCondition(index, {
                value:
                  e.target.value === "" ? undefined : e.target.value === "true",
              })
            }
            className="h-8 w-24 rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-500"
          >
            <option value="">全部</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        );
      case "date":
      case "dateRange":
      case "text":
      default:
        return (
          <input
            type="text"
            value={condition.value ?? ""}
            onChange={(e) =>
              updateCondition(index, {
                value: e.target.value === "" ? undefined : e.target.value,
              })
            }
            className="h-8 w-40 rounded border border-slate-200 px-2 text-xs outline-none focus:border-blue-500"
          />
        );
    }
  };

  if (variant === "bar") {
    return (
      <div
        className={`flex items-center gap-3 rounded-figma-card border border-figma-border bg-figma-surface px-2.5 py-1 text-figma-paragraph text-figma-text-primary ${className ?? ""}`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-figma-surface-alt text-figma-text-secondary">
          <span className="flex flex-col gap-0.5">
            <span className="block h-0.5 w-3 rounded bg-current" />
            <span className="block h-0.5 w-2 rounded bg-current opacity-80" />
            <span className="block h-0.5 w-1.5 rounded bg-current opacity-60" />
          </span>
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {conditions.map((c, index) => (
            <span
              key={`${c.field}-${index}`}
              className="inline-flex items-center gap-1 rounded-figma-tag border border-figma-border bg-figma-surface px-2.5 py-1 text-figma-paragraph text-figma-text-primary shadow-figma-small"
            >
              {formatConditionLabel(c)}
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="ml-0.5 text-figma-text-secondary hover:text-figma-text-primary"
              >
                ×
              </button>
            </span>
          ))}
          {conditions.length === 0 && (
            <span className="text-figma-paragraph text-figma-text-secondary">
              添加筛选条件
            </span>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-figma-border bg-figma-surface text-figma-text-secondary shadow-figma-small hover:bg-figma-surface-alt hover:text-figma-text-primary"
          >
            +
          </button>
          {addOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setAddOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-figma-table border border-figma-border bg-figma-surface p-2 text-figma-paragraph shadow-figma-small">
                <div className="mb-1 px-2 py-1 text-figma-label-sm text-figma-text-secondary">
                  添加条件
                </div>
                {availableFields.length === 0 && (
                  <div className="px-2 py-1 text-figma-paragraph text-figma-text-secondary">
                    已无可用字段
                  </div>
                )}
                {availableFields.map((field) => (
                  <button
                    key={field.field}
                    type="button"
                    onClick={() => handleAddField(field.field)}
                    className="block w-full rounded px-2 py-1.5 text-left text-figma-paragraph text-figma-text-primary hover:bg-figma-surface-alt"
                  >
                    {field.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleLoadSaved}
                  className="mt-1 block w-full rounded px-2 py-1.5 text-left text-figma-paragraph text-figma-primary hover:bg-figma-surface-alt"
                >
                  使用已保存条件
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="mt-1 block w-full rounded px-2 py-1.5 text-left text-figma-paragraph text-figma-text-secondary hover:bg-figma-surface-alt"
                >
                  保存当前条件
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">筛选条件</span>
          <button
            type="button"
            onClick={handleLoadSaved}
            className="text-[11px] text-blue-500 hover:underline"
          >
            使用已保存条件
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-7 min-w-[120px] rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleAddField(e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="">添加条件</option>
            {availableFields.map((field) => (
              <option key={field.field} value={field.field}>
                {field.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            className="h-7 rounded border border-slate-200 bg-slate-50 px-3 text-xs text-slate-600 hover:bg-slate-100"
          >
            保存条件
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-7 rounded bg-blue-500 px-3 text-xs font-medium text-white hover:bg-blue-600"
          >
            应用
          </button>
        </div>
      </div>

      {conditions.length > 0 && (
        <div className="flex flex-col gap-1">
          {conditions.map((condition, index) => (
            <div
              key={`${condition.field}-${index}`}
              className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1 text-xs transition-opacity duration-150"
            >
              <span className="min-w-[80px] text-slate-700">
                {condition.label}
              </span>
              <select
                className="h-7 rounded border border-slate-200 bg-white px-2 text-xs text-slate-600 outline-none"
                value={condition.operator}
                onChange={(e) =>
                  updateCondition(index, { operator: e.target.value })
                }
              >
                {(
                  fields.find((f) => f.field === condition.field)
                    ?.operators ?? ["=", "!=", "contains"]
                )?.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              {renderValueInput(condition, index)}
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="ml-1 h-6 w-6 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
