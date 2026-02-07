import React, { useCallback, useMemo, useState } from "react";
import {
  CommonTable,
  type CommonColumnType,
  type FilterCondition,
  type FilterConditionDateValue,
  type FilterFieldMeta,
  type Key,
} from "../components/table";

/** 与 Figma 会话洞察「会话列表」一致的示例数据类型 */
interface SessionRecord {
  key: string;
  sessionId: string;
  channel: string;
  duration: string;
  durationSeconds: number;
  roundCount: string;
  startTime: string;
  endTime: string;
  importTime: string;
}

function uuidLike(): string {
  const hex = (): string => Math.floor(Math.random() * 16).toString(16);
  const replacer = (c: string): string =>
    c === "x" ? hex() : String((parseInt(hex(), 16) & 0x3) | 0x8);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, replacer);
}

function formatTime(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${h}:${min}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} mins ${secs}s`;
}

const channels = ["得助在线客服", "企微客服", "网页客服", "APP客服"];

const demoData: SessionRecord[] = Array.from({ length: 48 }, (_, i) => {
  const base = new Date(2024, 4, 23, 18, 3 + (i % 60), 0);
  const durationSec = 60 + (i % 120) + Math.floor(Math.random() * 30);
  return {
    key: uuidLike(),
    sessionId: uuidLike(),
    channel: channels[i % channels.length],
    duration: formatDuration(durationSec),
    durationSeconds: durationSec,
    roundCount: `${(i % 15) + 5}次`,
    startTime: formatTime(base),
    endTime: formatTime(new Date(base.getTime() + durationSec * 1000)),
    importTime: formatTime(base),
  };
});

const filterFields: FilterFieldMeta[] = [
  {
    field: "sessionId",
    label: "会话ID",
    type: "text",
    operators: ["=", "包含", "不等于"],
  },
  {
    field: "channel",
    label: "渠道",
    type: "select",
    operators: ["="],
    options: channels.map((c) => ({ label: c, value: c })),
  },
  {
    field: "durationSeconds",
    label: "会话时长",
    type: "number",
    operators: [">", "<", ">=", "<=", "="],
  },
  {
    field: "roundCount",
    label: "会话轮次",
    type: "text",
    operators: ["=", "包含"],
  },
  {
    field: "startTime",
    label: "会话开始时间",
    type: "date",
    operators: ["before", "after"],
  },
];

const columns: CommonColumnType<SessionRecord>[] = [
  {
    key: "sessionId",
    dataIndex: "sessionId",
    title: "会话ID",
    width: 280,
    render: (val: string) => (
      <span className="flex items-center gap-2">
        <span className="truncate font-normal text-figma-text-primary">
          {val.length > 20
            ? `${val.slice(0, 8)}-${val.slice(8, 12)}-${val.slice(12, 16)}-...`
            : val}
        </span>
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-figma-tag border border-figma-border bg-figma-surface-alt text-figma-text-secondary hover:bg-figma-surface hover:text-figma-text-primary"
          title="复制"
          aria-label="复制"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </span>
    ),
  },
  {
    key: "channel",
    dataIndex: "channel",
    title: "渠道",
    width: 140,
    sorter: true,
  },
  {
    key: "duration",
    dataIndex: "duration",
    title: "时长",
    width: 114,
    sorter: (a, b) => a.durationSeconds - b.durationSeconds,
  },
  {
    key: "roundCount",
    dataIndex: "roundCount",
    title: "会话轮次",
    width: 112,
    sorter: true,
  },
  {
    key: "startTime",
    dataIndex: "startTime",
    title: "会话开始时间",
    width: 160,
    sorter: true,
  },
  {
    key: "endTime",
    dataIndex: "endTime",
    title: "会话结束时间",
    width: 160,
    sorter: true,
  },
  {
    key: "importTime",
    dataIndex: "importTime",
    title: "导入时间",
    width: 160,
    sorter: true,
  },
  {
    key: "action",
    dataIndex: "action",
    title: "操作",
    width: 56,
    align: "center",
    render: () => (
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-figma-text-secondary hover:bg-figma-surface-alt hover:text-figma-text-primary"
        title="更多"
        aria-label="更多"
      >
        <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="7" cy="2" r="1.5" />
          <circle cx="12" cy="2" r="1.5" />
        </svg>
      </button>
    ),
  },
];

export function TableDemo() {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>(
    [],
  );
  const [visibleKeys, setVisibleKeys] = useState<Key[]>(
    columns.map((c) => c.key ?? c.dataIndex).filter(Boolean) as Key[],
  );

  const handleTableChange = useCallback(
    (
      pagination: unknown,
      filters: unknown,
      sorter: unknown,
      extra: unknown,
    ) => {
      console.log("Table onChange", { pagination, filters, sorter, extra });
    },
    [],
  );

  const handleFilterChange = useCallback((conditions: FilterCondition[]) => {
    setFilterConditions(conditions);
  }, []);

  const filteredData = useMemo(() => {
    if (!filterConditions.length) return demoData;
    return demoData.filter((record) => {
      return filterConditions.every((c) => {
        const recordVal = (record as unknown as Record<string, unknown>)[
          c.field
        ];
        if (c.type === "number") {
          const num = Number(recordVal);
          const v = Number(c.value);
          if (Number.isNaN(v)) return true;
          switch (c.operator) {
            case ">":
              return num > v;
            case "<":
              return num < v;
            case ">=":
              return num >= v;
            case "<=":
              return num <= v;
            case "等于":
              return num === v;
            default:
              return true;
          }
        }
        if (c.type === "text") {
          const s = String(recordVal ?? "");
          const v = String(c.value ?? "");
          switch (c.operator) {
            case "包含":
              return s.includes(v);
            case "等于":
              return s === v;
            case "不等于":
              return s !== v;
            case "开头是":
              return s.startsWith(v);
            case "结尾是":
              return s.endsWith(v);
            default:
              return true;
          }
        }
        if (c.type === "date" || c.type === "dateRange") {
          const v = c.value as FilterConditionDateValue | undefined;
          if (!v?.date) return true;
          const recordStr = String(recordVal ?? "").trim();
          const recordTs = Number.isNaN(
            Date.parse(recordStr.replace(/\./g, "-").replace(" ", "T")),
          )
            ? 0
            : new Date(
                recordStr.replace(/\./g, "-").replace(" ", "T") + ":00",
              ).getTime();
          const condTime = (v.time || "00:00").split(":");
          const condTs = new Date(
            `${v.date}T${condTime[0]}:${condTime[1] || "00"}:00`,
          ).getTime();
          if (v.when === "before") return recordTs < condTs;
          return recordTs > condTs;
        }
        if (c.type === "select") {
          return String(recordVal) === String(c.value);
        }
        if (c.type === "boolean") {
          return recordVal === c.value;
        }
        return true;
      });
    });
  }, [filterConditions]);

  const formatFilterLabel = useCallback((c: FilterCondition) => {
    if (c.type === "date" || c.type === "dateRange") {
      const v = c.value as FilterConditionDateValue | undefined;
      if (!v) return `${c.label} ${c.operator}`;
      const when = v.when === "before" ? "before" : "after";
      const d = v.date || "";
      const t = v.time || "00:00";
      return `${c.label} ${when} ${d} ${t}`.trim();
    }
    const value =
      c.value === undefined || c.value === "" ? "" : String(c.value);
    const suffix = c.type === "number" ? "s" : "";
    return value
      ? `${c.label} ${c.operator} ${value}${suffix}`
      : `${c.label} ${c.operator}`;
  }, []);

  return (
    <div className="min-h-screen bg-figma-page p-6 font-sans">
      <div className="mx-auto max-w-[1320px]">
        <h1 className="mb-4 text-figma-label-md tracking-figma-md text-figma-text-primary">
          会话洞察 · 会话列表
        </h1>
        <CommonTable<SessionRecord>
          title="会话列表"
          columns={columns}
          dataSource={filteredData}
          rowKey="key"
          searchPlaceholder="搜索"
          pagination={{
            current: 1,
            pageSize: 10,
            serverSide: false,
          }}
          // rowSelection={{
          //   type: "checkbox",
          //   preserveSelectedRowKeys: true,
          //   onChange: (selectedRowKeys, selectedRows) => {
          //     console.log("选中行", selectedRowKeys, selectedRows);
          //   },
          // }}
          filterBuilderProps={{
            id: "session-list-filter",
            fields: filterFields,
            value: filterConditions,
            onChange: handleFilterChange,
            variant: "bar",
            formatConditionLabel: formatFilterLabel,
          }}
          columnSettingsProps={{
            allColumns: columns,
            visibleKeys,
            onChange: setVisibleKeys,
          }}
          onChange={handleTableChange}
          bordered={false}
          size="middle"
        />
      </div>
    </div>
  );
}
