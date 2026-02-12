import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ColumnSettings } from "./ColumnSettings";
import type {
  CommonColumnType,
  CommonTableProps,
  Key,
  PaginationConfig,
  RowSelection,
  SortOrder,
  SorterResult,
  TableFilters,
} from "./types";

// ========== 工具函数：列 key、取单元格值、滚动尺寸解析（改列宽/取数逻辑可改这里） ==========
function getColumnKey<T>(col: CommonColumnType<T>, index: number): Key {
  if (col.key !== undefined && col.key !== null) return col.key;
  if (typeof col.dataIndex === "string") return col.dataIndex;
  return index;
}

function getCellValue<T>(record: T, dataIndex: string | undefined): any {
  if (dataIndex == null) return undefined;
  const path = dataIndex.split(".");
  let value: any = record;
  for (const p of path) {
    value = value?.[p];
  }
  return value;
}

const SELECTION_COL_WIDTH = 40; // 行选择列宽度，改选择列宽度改这里

function parseScrollDimension(
  v: number | string | undefined,
): number | string | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  const num = parseInt(v, 10);
  if (!Number.isNaN(num) && String(num) === String(v).trim()) return num;
  return v;
}

export function CommonTable<T extends Record<string, any> = any>({
  columns,
  dataSource,
  rowKey = "key",
  pagination: paginationProp = { current: 1, pageSize: 10 },
  rowSelection: rowSelectionProp,
  loading = false,
  bordered = true,
  size = "middle",
  title,
  searchPlaceholder = "搜索",
  searchValue,
  onSearchChange,
  columnSettingsProps,
  scroll: scrollProp,
  locale: localeProp,
  onRowClick,
  onChange,
}: CommonTableProps<T>) {
  // ---------- 文案与行 key ----------
  const emptyText = localeProp?.emptyText ?? "暂无数据";
  const loadingText = localeProp?.loadingText ?? "加载中...";
  const getRowKey = useCallback(
    (record: T): Key =>
      typeof rowKey === "function" ? rowKey(record) : (record[rowKey] as Key),
    [rowKey],
  );

  // ---------- 列：全部 key、可见列（列设置联动，改列显隐逻辑改这里） ----------
  const allColumnKeys = useMemo(
    () => columns.map((col, index) => getColumnKey(col, index)),
    [columns],
  );

  const visibleColumns = useMemo(() => {
    const keys = columnSettingsProps?.visibleKeys;
    if (keys == null) return columns;
    return columns.filter((col, index) => {
      const k = getColumnKey(col, index);
      return keys.includes(k);
    });
  }, [columns, columnSettingsProps?.visibleKeys]);

  // ---------- 滚动：y/x 解析、列布局与固定列偏移（改固定列/横向滚动改这里） ----------
  const scrollY = parseScrollDimension(scrollProp?.y);
  const scrollX = parseScrollDimension(scrollProp?.x);
  const scrollXNum =
    scrollX == null
      ? 0
      : typeof scrollX === "number"
        ? scrollX
        : parseInt(String(scrollX), 10) || 0;
  const hasScrollX = scrollX != null;
  const hasScrollY = scrollY != null;

  const columnLayout = useMemo(() => {
    // 含选择列 + 数据列，每项 key/width/fixed
    const items: { key: Key; width: number; fixed?: "left" | "right" }[] = [];
    if (rowSelectionProp) {
      items.push({
        key: "__selection__",
        width: SELECTION_COL_WIDTH,
        fixed: rowSelectionProp.fixed,
      });
    }
    visibleColumns.forEach((col, colIndex) => {
      const key = getColumnKey(col, columns.indexOf(col));
      const w = col.width ?? col.minWidth;
      const num =
        typeof w === "number"
          ? w
          : typeof w === "string" && /^\d+$/.test(String(w))
            ? Number(w)
            : 100;
      items.push({ key, width: num, fixed: col.fixed });
    });
    return items;
  }, [rowSelectionProp, visibleColumns, columns, getColumnKey]);

  const { leftOffsets, rightOffsets } = useMemo(() => {
    const left: number[] = [];
    const right: number[] = [];
    let leftAcc = 0;
    for (let i = 0; i < columnLayout.length; i++) {
      left[i] = leftAcc;
      if (columnLayout[i].fixed === "left") leftAcc += columnLayout[i].width;
    }
    let rightAcc = 0;
    for (let i = columnLayout.length - 1; i >= 0; i--) {
      right[i] = rightAcc;
      if (columnLayout[i].fixed === "right") rightAcc += columnLayout[i].width;
    }
    return { leftOffsets: left, rightOffsets: right };
  }, [columnLayout]);

  // ---------- 滚动容器与固定列阴影状态 ----------
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });

  const hasScroll = hasScrollY || hasScrollX;

  const handleScroll = useCallback(() => {
    if (!hasScroll) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollPos({
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  }, [scrollY, scrollX, hasScroll]);

  // 当页面和表格都存在滚动条时，鼠标在表格内只滚动表格内容（用 passive: false 的 native 监听使 preventDefault 生效）
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || (!hasScrollY && !hasScrollX)) return;

    const onWheel = (e: WheelEvent) => {
      const hasVScroll = el.scrollHeight > el.clientHeight;
      const hasHScroll = el.scrollWidth > el.clientWidth;
      if (!hasVScroll && !hasHScroll) return;

      const deltaY = e.deltaY;
      const deltaX = e.deltaX;
      if (deltaY === 0 && deltaX === 0) return;

      let shouldPrevent = false;
      if (deltaY !== 0 && hasVScroll) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const atTop = scrollTop <= 0;
        const atBottom = scrollTop + clientHeight >= scrollHeight;
        if (deltaY < 0 && atTop) {
          shouldPrevent = true;
          el.scrollTop = 0;
        } else if (deltaY > 0 && atBottom) {
          shouldPrevent = true;
          el.scrollTop = scrollHeight - clientHeight;
        } else {
          shouldPrevent = true;
          el.scrollTop += deltaY;
        }
      }
      if (deltaX !== 0 && hasHScroll) {
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const atLeft = scrollLeft <= 0;
        const atRight = scrollLeft + clientWidth >= scrollWidth;
        if (deltaX < 0 && atLeft) {
          shouldPrevent = true;
          el.scrollLeft = 0;
        } else if (deltaX > 0 && atRight) {
          shouldPrevent = true;
          el.scrollLeft = scrollWidth - clientWidth;
        } else {
          shouldPrevent = true;
          el.scrollLeft += deltaX;
        }
      }
      if (shouldPrevent) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [hasScrollY, hasScrollX]);

  useEffect(() => {
    if (!hasScroll) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const sync = () => {
      setScrollPos({
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasScroll]);

  const maxScrollLeft = Math.max(
    0,
    scrollPos.scrollWidth - scrollPos.clientWidth,
  );
  const hasHorizontalOverflow =
    hasScrollX &&
    scrollPos.scrollWidth > 0 &&
    scrollPos.clientWidth > 0 &&
    scrollPos.scrollWidth > scrollPos.clientWidth;
  // --- 固定列：仅在有横向溢出时生效；滚动同步由同一 scroll 容器 + sticky 保证；表头 z-[2]、表体固定列 z-[1] 保证层级 ---
  const showHeaderShadow = scrollY != null && scrollPos.scrollTop > 0;
  const showLeftFixedShadow = scrollPos.scrollLeft > 0;
  const showRightFixedShadow =
    maxScrollLeft > 0 && scrollPos.scrollLeft < maxScrollLeft;

  const fixedCellTransition = "box-shadow 0.2s ease";
  const shadowLeft = "3px 0 5px -2px rgba(0,0,0,0.08)";
  const shadowRight = "-2px 0 4px -2px rgba(0,0,0,0.08)";
  const shadowLeftCell = "3px 0 5px -2px rgba(0,0,0,0.06)";
  const shadowRightCell = "-2px 0 4px -2px rgba(0,0,0,0.06)";

  // ---------- 分页：受控/非受控、config（分页逻辑改这里，UI 由外部 TablePagination 渲染） ----------
  const [internalPagination, setInternalPagination] = useState({
    current: paginationProp === false ? 1 : (paginationProp?.current ?? 1),
    pageSize: paginationProp === false ? 10 : (paginationProp?.pageSize ?? 10),
  });

  const isPaginationControlled =
    paginationProp !== false && typeof paginationProp?.onChange === "function";

  const paginationConfig: PaginationConfig | false =
    paginationProp === false
      ? false
      : {
          ...(paginationProp || {}),
          current:
            isPaginationControlled &&
            paginationProp &&
            "current" in paginationProp
              ? paginationProp.current
              : internalPagination.current,
          pageSize:
            isPaginationControlled &&
            paginationProp &&
            "pageSize" in paginationProp
              ? paginationProp.pageSize
              : internalPagination.pageSize,
          total:
            paginationProp && "total" in paginationProp
              ? paginationProp.total
              : undefined,
          serverSide: paginationProp?.serverSide ?? false,
          onChange: paginationProp?.onChange,
        };

  // ---------- 筛选、排序、行选择、列设置/筛选下拉 UI 状态 ----------
  const [filters, setFilters] = useState<TableFilters>({});
  const [sorter, setSorter] = useState<{ field?: string; order?: SortOrder }>({
    field: undefined,
    order: null,
  });
  const [selectedRowKeySet, setSelectedRowKeySet] = useState<Set<Key>>(
    new Set(),
  );
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<string | null>(
    null,
  );

  const isServerSide = paginationConfig && paginationConfig.serverSide;
  const currentPage = paginationConfig !== false ? paginationConfig.current : 1;
  const pageSize = paginationConfig !== false ? paginationConfig.pageSize : 10;

  // ---------- 数据管道：筛选 → 排序 → 分页切片（改筛选/排序/分页数据逻辑改这里） ----------
  const filteredData = useMemo(() => {
    let result = dataSource;
    visibleColumns.forEach((col, colIndex) => {
      const key = getColumnKey(col, columns.indexOf(col));
      const filterValues = filters[key];
      if (!filterValues || filterValues.length === 0) return;
      const dataIndex = col.dataIndex as string | undefined;
      const onFilter = col.onFilter;
      result = result.filter((record) => {
        const cellValue = getCellValue(record, dataIndex);
        return filterValues.some((v) =>
          onFilter ? onFilter(v, record) : String(cellValue) === String(v),
        );
      });
    });
    return result;
  }, [dataSource, visibleColumns, columns, filters]);

  const sortedData = useMemo(() => {
    if (!sorter.field || !sorter.order) return filteredData;
    const col = visibleColumns.find((c) => {
      const k = getColumnKey(c, columns.indexOf(c));
      return String(k) === sorter.field || c.dataIndex === sorter.field;
    });
    if (!col) return filteredData;
    const sorterFn = col.sorter;
    if (typeof sorterFn === "function") {
      return [...filteredData].sort((a, b) => sorterFn!(a, b));
    }
    if (sorterFn === true) {
      const dataIndex = col.dataIndex as string | undefined;
      return [...filteredData].sort((a, b) => {
        const va = getCellValue(a, dataIndex);
        const vb = getCellValue(b, dataIndex);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sorter.order === "ascend" ? cmp : -cmp;
      });
    }
    return filteredData;
  }, [filteredData, sorter, visibleColumns, columns]);

  const total = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectiveCurrentPage =
    total === 0 ? 1 : Math.min(currentPage, totalPages);
  const displayData = useMemo(() => {
    if (isServerSide) return dataSource;
    const start = (effectiveCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [isServerSide, dataSource, sortedData, effectiveCurrentPage, pageSize]);

  useEffect(() => {
    if (isServerSide || total === 0) return;
    if (currentPage > totalPages && !isPaginationControlled) {
      setInternalPagination((prev) => ({
        ...prev,
        current: totalPages,
      }));
    }
  }, [total, totalPages, currentPage, isServerSide, isPaginationControlled]);

  const selectedRowKeys = useMemo(() => {
    if (rowSelectionProp?.selectedRowKeys != null)
      return rowSelectionProp.selectedRowKeys;
    return Array.from(selectedRowKeySet);
  }, [rowSelectionProp?.selectedRowKeys, selectedRowKeySet]);

  const selectedRows = useMemo(
    () =>
      dataSource.filter((record) =>
        selectedRowKeys.includes(getRowKey(record)),
      ),
    [dataSource, selectedRowKeys, getRowKey],
  );

  // ---------- 事件：onChange 透传、分页/筛选/排序/行选择（改交互回调改这里） ----------
  const triggerOnChange = useCallback(
    (
      pagination: PaginationConfig,
      f: TableFilters,
      s: SorterResult<T> | SorterResult<T>[],
      extra: { currentDataSource: T[] },
    ) => {
      onChange?.(pagination, f, s, extra);
    },
    [onChange],
  );

  const handlePaginationChange = useCallback(
    (page: number, newPageSize: number) => {
      const newPagination = {
        ...paginationConfig,
        current: page,
        pageSize: newPageSize,
        total: isServerSide ? paginationConfig?.total : total,
      } as PaginationConfig;
      if (paginationProp === false || !paginationProp) return;
      if (!isPaginationControlled) {
        setInternalPagination({ current: page, pageSize: newPageSize });
      }
      paginationProp.onChange?.(page, newPageSize);
      triggerOnChange(
        newPagination,
        filters,
        { field: sorter.field, order: sorter.order },
        {
          currentDataSource: displayData,
        },
      );
    },
    [
      paginationConfig,
      paginationProp,
      isPaginationControlled,
      isServerSide,
      total,
      filters,
      sorter,
      displayData,
      triggerOnChange,
    ],
  );

  const handleFilterChange = useCallback(
    (columnKey: Key, value: Key[] | null) => {
      const newFilters = { ...filters, [columnKey]: value };
      setFilters(newFilters);
      setFilterDropdownOpen(null);
      const newPagination = {
        ...paginationConfig,
        current: 1,
        pageSize,
        total: isServerSide ? paginationConfig?.total : total,
      } as PaginationConfig;
      if (!isPaginationControlled) {
        setInternalPagination((prev) => ({ ...prev, current: 1 }));
      }
      triggerOnChange(
        newPagination,
        newFilters,
        { field: sorter.field, order: sorter.order },
        {
          currentDataSource: displayData,
        },
      );
    },
    [
      filters,
      isPaginationControlled,
      paginationConfig,
      pageSize,
      isServerSide,
      total,
      sorter,
      displayData,
      triggerOnChange,
    ],
  );

  const handleSorterChange = useCallback(
    (field: string, nextOrder: SortOrder) => {
      setSorter({ field, order: nextOrder });
      const newPagination = {
        ...paginationConfig,
        current: 1,
        pageSize,
        total: isServerSide ? paginationConfig?.total : total,
      } as PaginationConfig;
      if (!isPaginationControlled) {
        setInternalPagination((prev) => ({ ...prev, current: 1 }));
      }
      triggerOnChange(
        newPagination,
        filters,
        { field, order: nextOrder },
        {
          currentDataSource: displayData,
        },
      );
    },
    [
      paginationConfig,
      pageSize,
      isServerSide,
      total,
      filters,
      displayData,
      isPaginationControlled,
      triggerOnChange,
    ],
  );

  const toggleRowSelection = useCallback(
    (record: T, selected: boolean) => {
      const key = getRowKey(record);
      let newSet: Set<Key>;
      if (rowSelectionProp?.selectedRowKeys != null) {
        if (selected) {
          newSet = new Set([...rowSelectionProp.selectedRowKeys!, key]);
        } else {
          newSet = new Set(
            rowSelectionProp.selectedRowKeys!.filter((k) => k !== key),
          );
        }
        rowSelectionProp.onChange?.(
          Array.from(newSet),
          dataSource.filter((r) => newSet.has(getRowKey(r))),
        );
        return;
      }
      setSelectedRowKeySet((prev) => {
        const next = new Set(prev);
        if (selected) next.add(key);
        else next.delete(key);
        rowSelectionProp?.onChange?.(
          Array.from(next),
          dataSource.filter((r) => next.has(getRowKey(r))),
        );
        return next;
      });
    },
    [getRowKey, rowSelectionProp, dataSource],
  );

  const toggleAllRowsOnPage = useCallback(
    (selected: boolean) => {
      if (rowSelectionProp?.type === "radio") return;
      const keysOnPage = displayData.map(getRowKey);
      if (rowSelectionProp?.selectedRowKeys != null) {
        let newSet: Key[];
        if (selected) {
          newSet = Array.from(
            new Set([...rowSelectionProp.selectedRowKeys!, ...keysOnPage]),
          );
        } else {
          const pageSet = new Set(keysOnPage);
          newSet = rowSelectionProp.selectedRowKeys!.filter(
            (k) => !pageSet.has(k),
          );
        }
        rowSelectionProp.onChange?.(
          newSet,
          dataSource.filter((r) => newSet.includes(getRowKey(r))),
        );
        return;
      }
      setSelectedRowKeySet((prev) => {
        const next = new Set(prev);
        keysOnPage.forEach((k) => (selected ? next.add(k) : next.delete(k)));
        rowSelectionProp?.onChange?.(
          Array.from(next),
          dataSource.filter((r) => next.has(getRowKey(r))),
        );
        return next;
      });
    },
    [displayData, getRowKey, rowSelectionProp, dataSource],
  );

  // ---------- 表头/单元格尺寸与边框类（改表格尺寸/边框样式改这里） ----------
  const rowSizeClass =
    size === "small"
      ? "py-1.5 px-3 text-sm"
      : size === "large"
        ? "py-4 px-5 text-sm"
        : "py-2 px-3 text-sm";
  const cellSizeClass =
    size === "small"
      ? "py-2 px-3"
      : size === "large"
        ? "py-4 px-5"
        : "py-3 pl-3 pr-5";
  const tableLayout = bordered ? "border border-200" : "";
  const borderR = bordered ? "border-r border-200" : "";
  const borderB = "border-b border-200";

  return (
    <div className="flex flex-col ">
      {/* ---------- 顶部栏：标题 + 搜索(可选) + 列设置按钮（改标题/列设置布局改这里） ---------- */}
      <div className="flex py-4 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {title && (
            <div className="text-base font-medium text-600">{title}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {columnSettingsProps && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnSettingsOpen((v) => !v)}
                className="flex items-center gap-1 rounded-xl border border-200 bg-0 px-2.5 py-2 text-sm font-medium text-600 hover:bg-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d="M8.5 14.5H11.5V13H8.5V14.5ZM3.25 5.5V7H16.75V5.5H3.25ZM5.5 10.75H14.5V9.25H5.5V10.75Z"
                    fill="currentColor"
                  />
                </svg>
                <span>列设置</span>
              </button>
              {columnSettingsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setColumnSettingsOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1">
                    <ColumnSettings
                      allColumns={columnSettingsProps.allColumns ?? columns}
                      visibleKeys={
                        columnSettingsProps.visibleKeys ?? allColumnKeys
                      }
                      onChange={(keys) => {
                        columnSettingsProps.onChange?.(keys);
                        // 不在此处关闭弹窗，仅点击弹窗外部（上方 overlay）时关闭
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---------- 表格滚动容器 + table（改滚动区域样式/table 宽度改这里） ---------- */}
      <div
        ref={scrollContainerRef}
        onScroll={hasScroll ? handleScroll : undefined}
        className={`table-scroll-area min-w-0 w-full bg-0 ${bordered ? "border border-200" : ""} ${
          hasScrollY && hasScrollX
            ? "overflow-y-auto overflow-x-auto min-h-0"
            : hasScrollY
              ? "overflow-y-auto min-h-0"
              : hasScrollX
                ? "overflow-x-auto"
                : ""
        }`}
        style={
          scrollY != null
            ? {
                maxHeight:
                  typeof scrollY === "number" ? `${scrollY}px` : scrollY,
                minHeight: 0,
              }
            : undefined
        }
      >
        <table
          className={`${"-mt-1 -mb-1"} ${
            bordered
              ? "border-collapse"
              : "border-separate border-spacing-x-0 border-spacing-y-1"
          } ${tableLayout} ${hasScrollX ? "table-fixed" : "w-full"}`}
          style={
            hasScrollX && scrollXNum > 0
              ? {
                  minWidth: `max(100%, ${scrollXNum}px)`,
                  width: `max(100%, ${scrollXNum}px)`,
                }
              : undefined
          }
        >
          {/* ---------- 表头：选择列 + 数据列（排序图标、筛选下拉）（改表头/排序/筛选 UI 改这里） ---------- */}
          <thead>
            <tr
              className={`rounded-t-xl bg-100 ${scrollY != null ? "sticky top-0 z-[2]" : ""}`}
            >
              {rowSelectionProp && rowSelectionProp.type !== "radio" && (
                <th
                  className={`${borderR} ${borderB} ${rowSizeClass} text-left text-sm text-600 ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[2] bg-100" : ""}`}
                  style={{
                    width: SELECTION_COL_WIDTH,
                    minWidth: SELECTION_COL_WIDTH,
                    transition:
                      hasHorizontalOverflow && columnLayout[0]?.fixed
                        ? fixedCellTransition
                        : undefined,
                    ...(hasHorizontalOverflow &&
                    columnLayout[0]?.fixed === "left"
                      ? {
                          left: leftOffsets[0],
                          boxShadow: showLeftFixedShadow ? shadowLeft : "none",
                        }
                      : hasHorizontalOverflow &&
                          columnLayout[0]?.fixed === "right"
                        ? {
                            right: rightOffsets[0],
                            boxShadow: showRightFixedShadow
                              ? shadowRight
                              : "none",
                          }
                        : {}),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      displayData.length > 0 &&
                      displayData.every((r) =>
                        selectedRowKeys.includes(getRowKey(r)),
                      )
                    }
                    onChange={(e) => toggleAllRowsOnPage(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-200 text-primary"
                  />
                </th>
              )}
              {rowSelectionProp && rowSelectionProp.type === "radio" && (
                <th
                  className={`${borderR} ${borderB} ${rowSizeClass} text-left text-sm text-600 ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[2] bg-100" : ""}`}
                  style={{
                    width: SELECTION_COL_WIDTH,
                    minWidth: SELECTION_COL_WIDTH,
                    transition:
                      hasHorizontalOverflow && columnLayout[0]?.fixed
                        ? fixedCellTransition
                        : undefined,
                    ...(hasHorizontalOverflow &&
                    columnLayout[0]?.fixed === "left"
                      ? {
                          left: leftOffsets[0],
                          boxShadow: showLeftFixedShadow ? shadowLeft : "none",
                        }
                      : hasHorizontalOverflow &&
                          columnLayout[0]?.fixed === "right"
                        ? {
                            right: rightOffsets[0],
                            boxShadow: showRightFixedShadow
                              ? shadowRight
                              : "none",
                          }
                        : {}),
                  }}
                />
              )}
              {visibleColumns.map((col, colIndex) => {
                const key = getColumnKey(col, columns.indexOf(col));
                const layoutIndex = (rowSelectionProp ? 1 : 0) + colIndex;
                const layout = columnLayout[layoutIndex];
                const hasSorter = col.sorter != null;
                const hasFilter = col.filters && col.filters.length > 0;
                const currentOrder =
                  sorter.field === key || sorter.field === col.dataIndex
                    ? sorter.order
                    : null;
                const filterOpen = filterDropdownOpen === String(key);
                const isFixedLeft =
                  hasHorizontalOverflow && layout?.fixed === "left";
                const isFixedRight =
                  hasHorizontalOverflow && layout?.fixed === "right";

                return (
                  <th
                    key={key.toString()}
                    className={`${borderR} ${borderB} ${rowSizeClass} text-left text-sm font-normal text-600 ${bordered ? "last:border-r-0" : ""} ${isFixedLeft || isFixedRight ? "sticky z-[2] bg-100" : ""}`}
                    style={{
                      ...(col.width
                        ? { width: col.width, minWidth: col.width }
                        : {}),
                      transition:
                        isFixedLeft || isFixedRight
                          ? fixedCellTransition
                          : undefined,
                      ...(isFixedLeft
                        ? {
                            left: leftOffsets[layoutIndex],
                            boxShadow: showLeftFixedShadow
                              ? shadowLeft
                              : "none",
                          }
                        : isFixedRight
                          ? {
                              right: rightOffsets[layoutIndex],
                              boxShadow: showRightFixedShadow
                                ? shadowRight
                                : "none",
                            }
                          : {}),
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className={
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                              ? "text-right"
                              : ""
                        }
                      >
                        {col.title}
                      </span>
                      {hasSorter && (
                        <button
                          type="button"
                          onClick={() => {
                            const next: SortOrder =
                              currentOrder === null
                                ? "ascend"
                                : currentOrder === "ascend"
                                  ? "descend"
                                  : null;
                            handleSorterChange(
                              (col.dataIndex as string) ?? String(key),
                              next,
                            );
                          }}
                          className="ml-0.5 flex flex-col items-center justify-center gap-1 rounded p-0.5 text-600 hover:bg-100 hover:text-950"
                          title="排序"
                        >
                          <span
                            className={
                              currentOrder === "ascend"
                                ? "opacity-100"
                                : "opacity-40"
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="9"
                              height="5"
                              viewBox="0 0 9 5"
                              fill="none"
                              className="block"
                            >
                              <path
                                d="M4.5 0L9 4.5H0L4.5 0Z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          <span
                            className={
                              currentOrder === "descend"
                                ? "opacity-100"
                                : "opacity-40"
                            }
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="9"
                              height="5"
                              viewBox="0 0 9 5"
                              fill="none"
                              className="block"
                            >
                              <path
                                d="M4.5 4.5L0 0H9L4.5 4.5Z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                        </button>
                      )}
                      {hasFilter && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setFilterDropdownOpen(
                                filterOpen ? null : String(key),
                              )
                            }
                            className="rounded p-0.5 text-600 hover:bg-100 hover:text-950"
                            title="筛选"
                          >
                            ◆
                          </button>
                          {filterOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                aria-hidden
                                onClick={() => setFilterDropdownOpen(null)}
                              />
                              <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-xl border border-200 bg-0 p-2 shadow-lg transition-opacity duration-150">
                                {(col.filters || []).map((f) => {
                                  const selected = (
                                    filters[key] ?? []
                                  ).includes(f.value);
                                  return (
                                    <label
                                      key={String(f.value)}
                                      className="flex cursor-pointer items-center gap-2 py-1 text-sm text-950"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(e) => {
                                          const current = filters[key] ?? [];
                                          const next = e.target.checked
                                            ? [...current, f.value]
                                            : current.filter(
                                                (v) => v !== f.value,
                                              );
                                          handleFilterChange(
                                            key,
                                            next.length ? next : null,
                                          );
                                        }}
                                        className="h-3 w-3"
                                      />
                                      {f.text}
                                    </label>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => handleFilterChange(key, null)}
                                  className="mt-1 w-full rounded-lg border border-200 px-2 py-1 text-sm text-600 hover:bg-100"
                                >
                                  重置
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          {/* ---------- 表体：加载中 / 空数据 / 数据行（改空态/加载态/行样式改这里） ---------- */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (rowSelectionProp ? 1 : 0)}
                  className={`${borderB} py-8 text-center text-sm text-600`}
                >
                  {loadingText}
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (rowSelectionProp ? 1 : 0)}
                  className={`${borderB} py-8 text-center text-sm text-600`}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              /* ---------- 数据行：选择列 + 数据列，固定列 left/right 与阴影 ---------- */
              displayData.map((record, index) => {
                const key = getRowKey(record);
                const rowKeySafe =
                  key !== undefined && key !== null ? key : index;
                const selected = selectedRowKeys.includes(key);
                return (
                  <tr
                    key={rowKeySafe.toString()}
                    className={`group cursor-pointer bg-100 ${selected ? "bg-primary/10" : ""}`}
                    onClick={
                      onRowClick
                        ? (e) => {
                            const target = e.target as HTMLElement;
                            // 行内按钮/复选框/链接点击不触发行点击
                            if (target.closest("button, input, a")) return;
                            onRowClick(record, index);
                          }
                        : undefined
                    }
                    role={onRowClick ? "button" : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(record, index);
                            }
                          }
                        : undefined
                    }
                  >
                    {rowSelectionProp && rowSelectionProp.type !== "radio" && (
                      <td
                        className={`${borderR} ${borderB} bg-0 px-3 py-3 group-hover:bg-50 ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[1] bg-0" : ""}`}
                        style={{
                          transition:
                            hasHorizontalOverflow && columnLayout[0]?.fixed
                              ? fixedCellTransition
                              : undefined,
                          ...(hasHorizontalOverflow &&
                          columnLayout[0]?.fixed === "left"
                            ? {
                                left: leftOffsets[0],
                                boxShadow: showLeftFixedShadow
                                  ? shadowLeftCell
                                  : "none",
                              }
                            : hasHorizontalOverflow &&
                                columnLayout[0]?.fixed === "right"
                              ? {
                                  right: rightOffsets[0],
                                  boxShadow: showRightFixedShadow
                                    ? shadowRightCell
                                    : "none",
                                }
                              : {}),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) =>
                            toggleRowSelection(record, e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border-200 text-primary"
                        />
                      </td>
                    )}
                    {rowSelectionProp && rowSelectionProp.type === "radio" && (
                      <td
                        className={`${borderR} ${borderB} bg-0 px-3 py-3 group-hover:bg-50 ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[1] bg-0" : ""}`}
                        style={{
                          transition:
                            hasHorizontalOverflow && columnLayout[0]?.fixed
                              ? fixedCellTransition
                              : undefined,
                          ...(hasHorizontalOverflow &&
                          columnLayout[0]?.fixed === "left"
                            ? {
                                left: leftOffsets[0],
                                boxShadow: showLeftFixedShadow
                                  ? shadowLeftCell
                                  : "none",
                              }
                            : hasHorizontalOverflow &&
                                columnLayout[0]?.fixed === "right"
                              ? {
                                  right: rightOffsets[0],
                                  boxShadow: showRightFixedShadow
                                    ? shadowRightCell
                                    : "none",
                                }
                              : {}),
                        }}
                      >
                        <input
                          type="radio"
                          name="table-row-select"
                          checked={selected}
                          onChange={() => {
                            if (!selected) {
                              setSelectedRowKeySet(new Set([key]));
                              rowSelectionProp.onChange?.([key], [record]);
                            }
                          }}
                          className="h-3.5 w-3.5 border-200 text-primary"
                        />
                      </td>
                    )}
                    {visibleColumns.map((col, colIndex) => {
                      const colKey = getColumnKey(col, columns.indexOf(col));
                      const layoutIndex = (rowSelectionProp ? 1 : 0) + colIndex;
                      const layout = columnLayout[layoutIndex];
                      const isFixedLeft =
                        hasHorizontalOverflow && layout?.fixed === "left";
                      const isFixedRight =
                        hasHorizontalOverflow && layout?.fixed === "right";
                      const value = getCellValue(
                        record,
                        col.dataIndex as string,
                      );
                      const content = col.render
                        ? col.render(value, record, index)
                        : value;
                      return (
                        <td
                          key={colKey.toString()}
                          className={`${borderR} ${borderB} bg-0 ${cellSizeClass} text-sm text-950 group-hover:bg-50 ${bordered ? "last:border-r-0" : ""} ${isFixedLeft || isFixedRight ? "sticky z-[1] bg-0" : ""}`}
                          style={{
                            ...(col.align ? { textAlign: col.align } : {}),
                            transition:
                              isFixedLeft || isFixedRight
                                ? fixedCellTransition
                                : undefined,
                            ...(isFixedLeft
                              ? {
                                  left: leftOffsets[layoutIndex],
                                  boxShadow: showLeftFixedShadow
                                    ? shadowLeftCell
                                    : "none",
                                }
                              : isFixedRight
                                ? {
                                    right: rightOffsets[layoutIndex],
                                    boxShadow: showRightFixedShadow
                                      ? shadowRightCell
                                      : "none",
                                  }
                                : {}),
                          }}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页不集成：需用时在页面中单独引用 TablePagination，与 pagination 的 current/pageSize/total/onChange 联动 */}
    </div>
  );
}
