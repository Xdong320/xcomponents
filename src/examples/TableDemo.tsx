import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import {
  CommonTable,
  FilterBuilder,
  TablePagination,
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

const TitleComponent = () => {
  const [addOpen, setAddOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(
    null,
  );
  const triggerRef = useRef<HTMLDivElement | null>(null);

  const handleOpen = () => {
    if (typeof document !== "undefined" && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setAnchor({
        left: rect.left,
        top: rect.bottom + 14, // 稍微下移一点，避开表头边框
      });
    }
    setAddOpen(true);
  };

  const handleClose = () => {
    setAddOpen(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex cursor-pointer items-center"
        aria-hidden
        onClick={handleOpen}
      >
        会话ID
      </div>
      {addOpen && anchor && typeof document !== "undefined" && (
        <>
          <div
            className="fixed z-[100] h-[300px] w-56 overflow-auto rounded-xl border border-gray-300 bg-gray-500"
            style={{
              left: anchor.left,
              top: anchor.top,
            }}
          >
            test弹窗背遮挡问题
            <div onClick={handleClose}>X</div>
          </div>
        </>
      )}
    </>
  );
};
const columns: CommonColumnType<SessionRecord>[] = [
  {
    key: "sessionId",
    dataIndex: "sessionId",
    title: <TitleComponent />,
    width: 280,
    fixed: "left",
    render: (val: string) => (
      <span className="flex items-center gap-2">
        <span className="truncate font-normal text-950">
          {val.length > 20
            ? `${val.slice(0, 8)}-${val.slice(8, 12)}-${val.slice(12, 16)}-...`
            : val}
        </span>
        <button
          type="button"
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border border-200 bg-100 text-600 hover:bg-0 hover:text-950"
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
    fixed: "left",
    sorter: true,
    filters: channels.map((c) => ({ text: c, value: c })),
    filterMultiple: true,
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
    fixed: "right",
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
    fixed: "right",
    align: "center",
    render: () => (
      <button
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-600 hover:bg-100 hover:text-950"
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
  const [paginationCurrent, setPaginationCurrent] = useState(1);
  const [paginationPageSize, setPaginationPageSize] = useState(10);

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
    setPaginationCurrent(1);
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

  const paginationTotalPages = Math.max(
    1,
    Math.ceil(filteredData.length / paginationPageSize),
  );
  /** 自定义分页（pagination=false）时使用：模拟服务端分页，仅传当前页切片 */
  const paginatedData = useMemo(() => {
    const start = (paginationCurrent - 1) * paginationPageSize;
    return filteredData.slice(start, start + paginationPageSize);
  }, [filteredData, paginationCurrent, paginationPageSize]);

  /** true=自定义分页+外部 TablePagination，false=默认分页（CommonTable 内置） */
  const useCustomPagination = true;
  useEffect(() => {
    if (paginationCurrent > paginationTotalPages) {
      setPaginationCurrent(paginationTotalPages);
    }
  }, [paginationTotalPages, paginationCurrent]);

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
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-white font-sans">
      <div className="mx-auto min-w-0 max-w-[1320px] p-6">
        <h1 className="mb-4 text-base font-medium tracking-normal text-950">
          会话洞察 · 会话列表
        </h1>
        <div className="flex flex-col gap-4">
          <FilterBuilder
            // 必选：实例唯一 id（用于本地存储已保存筛选）
            id="session-list-filter"
            // 必选：可筛字段定义（字段名、类型、操作符、下拉选项等）
            fields={filterFields}
            // 可选：当前筛选条件（受控）；不传则内部维护
            value={filterConditions}
            // 可选：条件变更回调（与外部 state 联动）
            onChange={handleFilterChange}
            // 可选：展示形态，'bar' = 顶部标签条，'panel' = 独立筛选面板
            variant="bar"
            // 可选：自定义标签文案格式化
            formatConditionLabel={formatFilterLabel}
          />
          <CommonTable<SessionRecord>
            columns={columns}
            dataSource={useCustomPagination ? paginatedData : filteredData}
            rowKey="key"
            pagination={
              useCustomPagination
                ? false
                : {
                    current: paginationCurrent,
                    pageSize: paginationPageSize,
                    serverSide: false,
                    onChange: (page, pageSize) => {
                      setPaginationCurrent(page);
                      setPaginationPageSize(pageSize);
                    },
                  }
            }
            // 可选：行选择配置（多选、单选、受控 selectedRowKeys 等）
            rowSelection={{
              type: "checkbox",
              fixed: "left",
              preserveSelectedRowKeys: true,
              onChange: (selectedRowKeys, selectedRows) => {
                console.log("选中行", selectedRowKeys, selectedRows);
              },
            }}
            // 可选：是否显示边框，默认 true
            bordered={false}
            // 可选：表格尺寸 'small' | 'middle' | 'large'
            size="middle"
            // 可选：表格左上角标题
            title="会话列表"
            // 可选：搜索占位符（当前示例暂未开启搜索输入框）
            searchPlaceholder="搜索"
            // 可选：列设置配置（显示/隐藏列）
            columnSettingsProps={{
              allColumns: columns,
              visibleKeys,
              onChange: setVisibleKeys,
            }}
            // 可选：表头/列固定与滚动区域
            scroll={{ y: 150, x: 1200 }}
            // 可选：文案本地化（空态、加载中文案），默认内部文案
            // locale={{ emptyText: "暂无数据", loadingText: "加载中..." }}
            // 可选：点击行回调（例如打开详情侧边栏）
            onRowClick={(record, index) => {
              console.log("点击行", { record, index });
            }}
            // 可选：分页 / 筛选 / 排序变化回调
            onChange={handleTableChange}
          />
          {useCustomPagination && (
            <TablePagination
              current={paginationCurrent}
              pageSize={paginationPageSize}
              total={filteredData.length}
              totalPages={paginationTotalPages}
              onChange={(page, pageSize) => {
                setPaginationCurrent(page);
                setPaginationPageSize(pageSize);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
