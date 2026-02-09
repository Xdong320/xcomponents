import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FilterBuilderProps,
  FilterCondition,
  FilterConditionDateValue,
  FilterFieldMeta,
  SavedFilterPreset,
} from "./types";

const PRESETS_KEY_PREFIX = "filter_builder_presets_";

function getPresetsKey(id: string) {
  return `${PRESETS_KEY_PREFIX}${id}`;
}

function loadPresets(id: string): SavedFilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getPresetsKey(id));
    if (!raw) return [];
    return JSON.parse(raw) as SavedFilterPreset[];
  } catch {
    return [];
  }
}

function savePresets(id: string, presets: SavedFilterPreset[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getPresetsKey(id), JSON.stringify(presets));
  } catch {
    // ignore
  }
}

function createEmptyCondition(fieldMeta: FilterFieldMeta): FilterCondition {
  const ops = getOperatorsForType(fieldMeta.type);
  return {
    field: fieldMeta.field,
    label: fieldMeta.label,
    type: fieldMeta.type,
    operator: ops[0] ?? "=",
    value:
      fieldMeta.type === "date" || fieldMeta.type === "dateRange"
        ? { when: "after", date: "", time: "00:00" }
        : undefined,
  };
}

function getOperatorsForType(type: FilterFieldMeta["type"]): string[] {
  switch (type) {
    case "date":
    case "dateRange":
      return ["before", "after"];
    case "text":
      return ["包含", "等于", "不等于", "开头是", "结尾是"];
    case "number":
      return ["大于", "小于", "等于", "大于等于", "小于等于"];
    default:
      return ["=", "!=", "包含"];
  }
}

function defaultTagLabel(c: FilterCondition): string {
  if (c.type === "date" || c.type === "dateRange") {
    const v = c.value as FilterConditionDateValue | undefined;
    if (!v) return `${c.label} ${c.operator}`;
    const when = v.when === "before" ? "before" : "after";
    const d = v.date || "";
    const t = v.time || "00:00";
    return `${c.label} ${when} ${d} ${t}`.trim();
  }
  const value = c.value === undefined || c.value === "" ? "" : String(c.value);
  return value
    ? `${c.label} ${c.operator} ${value}`
    : `${c.label} ${c.operator}`;
}

interface FilterBuilderInternalProps extends FilterBuilderProps {
  className?: string;
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
  const [conditions, setConditions] = useState<FilterCondition[]>(() =>
    value?.length ? value : [],
  );
  const [presets, setPresets] = useState<SavedFilterPreset[]>(() =>
    loadPresets(id),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [conditionDialog, setConditionDialog] = useState<{
    condition: FilterCondition;
    fieldMeta: FilterFieldMeta;
  } | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    if (value) setConditions(value);
  }, [value]);

  useEffect(() => {
    setPresets(loadPresets(id));
  }, [id]);

  const applyConditions = useCallback(
    (next: FilterCondition[]) => {
      setConditions(next);
      onChange?.(next);
    },
    [onChange],
  );

  const removeCondition = useCallback(
    (index: number) => {
      setConditions((prev) => {
        const next = prev.filter((_, i) => i !== index);
        onChange?.(next);
        return next;
      });
    },
    [onChange],
  );

  const handleSelectField = useCallback(
    (fieldName: string) => {
      const meta = fields.find((f) => f.field === fieldName);
      if (!meta) return;
      setAddOpen(false);
      setConditionDialog({
        condition: createEmptyCondition(meta),
        fieldMeta: meta,
      });
    },
    [fields],
  );

  const handleSelectSavedPreset = useCallback(
    (preset: SavedFilterPreset) => {
      setConditions(preset.conditions);
      onChange?.(preset.conditions);
      setAddOpen(false);
    },
    [onChange],
  );

  const handleDeletePreset = useCallback(
    (e: React.MouseEvent, presetId: string) => {
      e.stopPropagation();
      const next = presets.filter((p) => p.id !== presetId);
      setPresets(next);
      savePresets(id, next);
    },
    [id, presets],
  );

  const handleApplyCondition = useCallback(() => {
    if (!conditionDialog) return;
    setConditions((prev) => {
      const next = [...prev, conditionDialog.condition];
      onChange?.(next);
      return next;
    });
    setConditionDialog(null);
  }, [conditionDialog, onChange]);

  const handleSavePreset = useCallback(() => {
    if (!saveName.trim()) return;
    const newPreset: SavedFilterPreset = {
      id: `preset_${Date.now()}`,
      name: saveName.trim(),
      conditions: [...conditions],
    };
    const next = [...presets, newPreset];
    setPresets(next);
    savePresets(id, next);
    setSaveName("");
    setSaveModalOpen(false);
  }, [id, conditions, presets, saveName]);

  const tagsWrapClass = "flex min-w-0 flex-1 flex-wrap items-center gap-2";

  if (variant !== "bar") {
    return (
      <div
        className={`flex flex-col gap-2 rounded-table border border-200 bg-0 p-3 shadow-small ${className ?? ""}`}
      >
        <div className="text-sm text-600">筛选条件（请使用 variant="bar"）</div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-card border-b border-200 bg-0 px-2.5 py-2 text-sm text-950 ${className ?? ""}`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-100 text-600">
          <span className="flex flex-col gap-0.5">
            <span className="block h-0.5 w-3 rounded bg-current" />
            <span className="block h-0.5 w-2 rounded bg-current opacity-80" />
            <span className="block h-0.5 w-1.5 rounded bg-current opacity-60" />
          </span>
        </span>
        <div className={tagsWrapClass}>
          {conditions.map((c, index) => (
            <span
              key={`${c.field}-${index}`}
              className="inline-flex items-center gap-1 rounded-tag border border-200 bg-100 px-2.5 py-1 text-sm text-950 shadow-small"
            >
              {formatConditionLabel(c)}
              <button
                type="button"
                onClick={() => removeCondition(index)}
                className="ml-0.5 text-600 hover:text-950"
                aria-label="移除"
              >
                ×
              </button>
            </span>
          ))}
          {conditions.length === 0 && (
            <span className="text-sm text-gray-400">添加筛选条件</span>
          )}
          <div className="relative flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-200 bg-0 text-600 shadow-small hover:bg-100 hover:text-950"
              aria-label="添加筛选"
            >
              ＋
            </button>
            {addOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  aria-hidden
                  onClick={() => setAddOpen(false)}
                />
                <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-56 overflow-auto rounded-table border border-200 bg-0 py-2 text-sm shadow-small">
                  <div className="mb-1 px-3 py-1 text-sm font-medium text-600">
                    已保存的筛选
                  </div>
                  {presets.length === 0 && (
                    <div className="px-3 py-1.5 text-sm text-600">
                      暂无已保存
                    </div>
                  )}
                  {presets.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectSavedPreset(p)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSelectSavedPreset(p)
                      }
                      className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-950 hover:bg-100"
                    >
                      <span className="min-w-0 truncate">{p.name}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePreset(e, p.id)}
                        className="shrink-0 rounded p-0.5 text-600 hover:bg-200 hover:text-950"
                        aria-label="删除"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <div className="my-1 border-t border-200" />
                  <div className="mb-1 px-3 py-1 text-sm font-medium text-600">
                    表格字段
                  </div>
                  {fields.map((field) => (
                    <button
                      key={field.field}
                      type="button"
                      onClick={() => handleSelectField(field.field)}
                      className="block w-full px-3 py-1.5 text-left text-sm text-950 hover:bg-100"
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded-tag border border-200 bg-0 text-600 shadow-small hover:bg-100 hover:text-950"
            aria-label="保存筛选"
            title="保存当前筛选条件"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </button>
        </div>
      </div>

      {/* 保存筛选弹窗 */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="w-96 rounded-table border border-200 bg-0 p-4 shadow-small"
            role="dialog"
            aria-labelledby="save-filter-title"
          >
            <h3
              id="save-filter-title"
              className="mb-3 text-base font-medium text-950"
            >
              保存筛选
            </h3>
            <label className="mb-2 block text-sm text-600">
              Filter label<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="例：会话时长80-120s"
              className="mb-4 w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none placeholder:text-600 focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaveModalOpen(false);
                  setSaveName("");
                }}
                className="rounded-btn border border-200 px-3 py-1.5 text-sm text-600 hover:bg-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                disabled={!saveName.trim()}
                className="rounded-btn bg-primary px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 按类型弹出的条件编辑弹窗 */}
      {conditionDialog && (
        <ConditionDialog
          condition={conditionDialog.condition}
          fieldMeta={conditionDialog.fieldMeta}
          onApply={handleApplyCondition}
          onClose={() => setConditionDialog(null)}
          onUpdate={(patch) =>
            setConditionDialog((prev) =>
              prev
                ? {
                    ...prev,
                    condition: { ...prev.condition, ...patch },
                  }
                : null,
            )
          }
        />
      )}
    </>
  );
};

function ConditionDialog({
  condition,
  fieldMeta,
  onApply,
  onClose,
  onUpdate,
}: {
  condition: FilterCondition;
  fieldMeta: FilterFieldMeta;
  onApply: () => void;
  onClose: () => void;
  onUpdate: (patch: Partial<FilterCondition>) => void;
}) {
  const isDate = condition.type === "date" || condition.type === "dateRange";
  const isNumber = condition.type === "number";
  const isText = condition.type === "text";
  const isSelect = condition.type === "select";
  const isBoolean = condition.type === "boolean";
  const dateValue = (condition.value as FilterConditionDateValue) || {
    when: "after",
    date: "",
    time: "00:00",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div
        className="w-[320px] rounded-table border border-200 bg-0 p-4 shadow-small"
        role="dialog"
        aria-labelledby="condition-dialog-title"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3
            id="condition-dialog-title"
            className="text-base font-medium text-950"
          >
            {condition.label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-600 hover:bg-100 hover:text-950"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {isDate && (
          <>
            <div className="mb-2">
              <label className="mb-1 block text-sm text-600">
                before/after
              </label>
              <select
                value={dateValue.when ?? "after"}
                onChange={(e) =>
                  onUpdate({
                    value: {
                      ...dateValue,
                      when: e.target.value as "before" | "after",
                    },
                  })
                }
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              >
                <option value="before">before</option>
                <option value="after">after</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="mb-1 block text-sm text-600">
                日期 (MM/DD/YYYY)
              </label>
              <input
                type="date"
                value={dateValue.date ?? ""}
                onChange={(e) =>
                  onUpdate({
                    value: { ...dateValue, date: e.target.value },
                  })
                }
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-600">时间</label>
              <input
                type="time"
                value={dateValue.time ?? "00:00"}
                onChange={(e) =>
                  onUpdate({
                    value: { ...dateValue, time: e.target.value },
                  })
                }
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              />
            </div>
          </>
        )}

        {isNumber && (
          <>
            <div className="mb-2">
              <label className="mb-1 block text-sm text-600">操作符</label>
              <select
                value={condition.operator}
                onChange={(e) => onUpdate({ operator: e.target.value })}
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              >
                {getOperatorsForType("number").map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-600">值</label>
              <input
                type="number"
                value={condition.value ?? ""}
                onChange={(e) =>
                  onUpdate({
                    value:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              />
            </div>
          </>
        )}

        {isText && (
          <>
            <div className="mb-2">
              <label className="mb-1 block text-sm text-600">操作符</label>
              <select
                value={condition.operator}
                onChange={(e) => onUpdate({ operator: e.target.value })}
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              >
                {(fieldMeta.operators ?? getOperatorsForType("text")).map(
                  (op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-600">值</label>
              <input
                type="text"
                value={condition.value ?? ""}
                onChange={(e) =>
                  onUpdate({ value: e.target.value || undefined })
                }
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              />
            </div>
          </>
        )}

        {isSelect && (
          <>
            <div className="mb-2">
              <label className="mb-1 block text-sm text-600">操作符</label>
              <select
                value={condition.operator}
                onChange={(e) => onUpdate({ operator: e.target.value })}
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              >
                {(fieldMeta.operators ?? ["="]).map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm text-600">值</label>
              <select
                value={condition.value ?? ""}
                onChange={(e) =>
                  onUpdate({
                    value: e.target.value === "" ? undefined : e.target.value,
                  })
                }
                className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
              >
                <option value="">请选择</option>
                {fieldMeta.options?.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {isBoolean && (
          <div className="mb-3">
            <label className="mb-1 block text-sm text-600">值</label>
            <select
              value={
                condition.value === undefined ? "" : String(condition.value)
              }
              onChange={(e) =>
                onUpdate({
                  value:
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                })
              }
              className="w-full rounded-btn border border-200 bg-0 px-3 py-2 text-sm text-950 outline-none focus:border-primary"
            >
              <option value="">全部</option>
              <option value="true">是</option>
              <option value="false">否</option>
            </select>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onApply}
            className="rounded-btn bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            应用
          </button>
        </div>
      </div>
    </div>
  );
}
