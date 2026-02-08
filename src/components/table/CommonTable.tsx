import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FilterBuilder } from "./FilterBuilder";
import { ColumnSettings } from "./ColumnSettings";
import { TablePagination } from "./TablePagination";
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

const SELECTION_COL_WIDTH = 40;

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
  filterBuilderProps,
  columnSettingsProps,
  scroll: scrollProp,
  locale: localeProp,
  onChange,
}: CommonTableProps<T>) {
  const emptyText = localeProp?.emptyText ?? "暂无数据";
  const loadingText = localeProp?.loadingText ?? "加载中...";
  const getRowKey = useCallback(
    (record: T): Key =>
      typeof rowKey === "function" ? rowKey(record) : (record[rowKey] as Key),
    [rowKey],
  );

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

  const scrollY = parseScrollDimension(scrollProp?.y);
  const scrollX = parseScrollDimension(scrollProp?.x);
  const scrollXNum =
    scrollX == null
      ? 0
      : typeof scrollX === "number"
        ? scrollX
        : parseInt(String(scrollX), 10) || 0;
  const hasScrollX = scrollX != null;

  const columnLayout = useMemo(() => {
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

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState({
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: 0,
    clientWidth: 0,
  });

  const hasScroll = scrollY != null || scrollX != null;

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

  const rowSizeClass =
    size === "small"
      ? "py-1.5 px-3 text-figma-paragraph"
      : size === "large"
        ? "py-4 px-5 text-figma-paragraph"
        : "py-2 px-3 text-figma-paragraph";
  const cellSizeClass =
    size === "small"
      ? "py-2 px-3"
      : size === "large"
        ? "py-4 px-5"
        : "py-3 pl-3 pr-5";
  const tableLayout = bordered ? "border border-figma-border" : "";
  const borderR = bordered ? "border-r border-figma-border" : "";
  const borderB = "border-b border-figma-border";

  return (
    <div className="flex flex-col ">
      {filterBuilderProps && <FilterBuilder {...filterBuilderProps} />}
      {/* 标题与列设置同一行：标题左对齐，搜索 + 列设置右对齐 */}
      <div className="flex py-4 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {title && (
            <h2 className="text-figma-label-md text-figma-text-secondary">
              {title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-9 w-60 rounded-figma-btn border border-figma-border bg-figma-surface pl-9 pr-3 text-figma-paragraph text-figma-text-primary outline-none placeholder:text-figma-text-secondary focus:border-figma-primary"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-figma-text-secondary">
              🔍
            </span>
          </div>
          {columnSettingsProps && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnSettingsOpen((v) => !v)}
                className="flex items-center gap-1 rounded-figma-btn border border-figma-border bg-figma-surface px-2.5 py-2 text-figma-label-sm text-figma-text-secondary hover:bg-figma-surface-alt"
              >
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
                        setColumnSettingsOpen(false);
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={hasScroll ? handleScroll : undefined}
        className={`table-scroll-area min-w-0 w-full bg-figma-surface shadow-figma-small ${bordered ? "border border-figma-border" : ""} ${scrollY != null ? "overflow-y-auto overflow-x-auto min-h-0" : "overflow-x-auto"}`}
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
          className={`-mt-1 -mb-1 border-separate border-spacing-x-0 border-spacing-y-0 ${tableLayout} ${hasScrollX ? "table-fixed" : "w-full"}`}
          style={
            hasScrollX && scrollXNum > 0
              ? {
                  minWidth: `max(100%, ${scrollXNum}px)`,
                  width: `max(100%, ${scrollXNum}px)`,
                }
              : undefined
          }
        >
          <thead>
            <tr
              className={`rounded-t-figma-table bg-figma-surface-alt transition-shadow duration-200 ease-out ${scrollY != null ? "sticky top-0 z-[2]" : ""}`}
              style={
                showHeaderShadow
                  ? { boxShadow: "0 2px 8px -2px rgba(0,0,0,0.08)" }
                  : undefined
              }
            >
              {rowSelectionProp && rowSelectionProp.type !== "radio" && (
                <th
                  className={`${borderR} ${borderB} ${rowSizeClass} text-left text-figma-paragraph text-figma-text-secondary ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[2] bg-figma-surface-alt" : ""}`}
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
                    className="h-3.5 w-3.5 rounded border-figma-border text-figma-primary"
                  />
                </th>
              )}
              {rowSelectionProp && rowSelectionProp.type === "radio" && (
                <th
                  className={`${borderR} ${borderB} ${rowSizeClass} text-left text-figma-paragraph text-figma-text-secondary ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[2] bg-figma-surface-alt" : ""}`}
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
                    className={`${borderR} ${borderB} ${rowSizeClass} text-left text-figma-paragraph text-figma-text-secondary ${bordered ? "last:border-r-0" : ""} ${isFixedLeft || isFixedRight ? "sticky z-[2] bg-figma-surface-alt" : ""}`}
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
                          className="rounded p-0.5 text-figma-text-secondary hover:bg-figma-surface-alt hover:text-figma-text-primary"
                          title="排序"
                        >
                          {currentOrder === "ascend"
                            ? "↑"
                            : currentOrder === "descend"
                              ? "↓"
                              : "⇅"}
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
                            className="rounded p-0.5 text-figma-text-secondary hover:bg-figma-surface-alt hover:text-figma-text-primary"
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
                              <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-figma-table border border-figma-border bg-figma-surface p-2 shadow-figma-small transition-opacity duration-150">
                                {(col.filters || []).map((f) => {
                                  const selected = (
                                    filters[key] ?? []
                                  ).includes(f.value);
                                  return (
                                    <label
                                      key={String(f.value)}
                                      className="flex cursor-pointer items-center gap-2 py-1 text-figma-paragraph text-figma-text-primary"
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
                                  className="mt-1 w-full rounded-figma-tag border border-figma-border px-2 py-1 text-figma-paragraph text-figma-text-secondary hover:bg-figma-surface-alt"
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
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (rowSelectionProp ? 1 : 0)}
                  className={`${borderB} py-8 text-center text-figma-paragraph text-figma-text-secondary`}
                >
                  {loadingText}
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (rowSelectionProp ? 1 : 0)}
                  className={`${borderB} py-8 text-center text-figma-paragraph text-figma-text-secondary`}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              displayData.map((record, index) => {
                const key = getRowKey(record);
                const rowKeySafe =
                  key !== undefined && key !== null ? key : index;
                const selected = selectedRowKeys.includes(key);
                return (
                  <tr
                    key={rowKeySafe.toString()}
                    className={`group cursor-pointer bg-figma-surface-alt ${selected ? "bg-figma-primary/5" : ""}`}
                  >
                    {rowSelectionProp && rowSelectionProp.type !== "radio" && (
                      <td
                        className={`${borderR} ${borderB} bg-figma-surface px-3 py-3 group-hover:bg-gray-50 ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[1] bg-figma-surface" : ""}`}
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
                          className="h-3.5 w-3.5 rounded border-figma-border text-figma-primary"
                        />
                      </td>
                    )}
                    {rowSelectionProp && rowSelectionProp.type === "radio" && (
                      <td
                        className={`${borderR} ${borderB} bg-figma-surface px-3 py-3 group-hover:bg-gray-50 ${hasHorizontalOverflow && columnLayout[0]?.fixed ? "sticky z-[1] bg-figma-surface" : ""}`}
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
                          className="h-3.5 w-3.5 border-figma-border text-figma-primary"
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
                          className={`${borderR} ${borderB} bg-figma-surface ${cellSizeClass} text-figma-paragraph text-figma-text-primary group-hover:bg-gray-50 ${bordered ? "last:border-r-0" : ""} ${isFixedLeft || isFixedRight ? "sticky z-[1] bg-figma-surface" : ""}`}
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

      {paginationConfig !== false && (
        <TablePagination
          current={isServerSide ? currentPage : effectiveCurrentPage}
          pageSize={pageSize}
          total={isServerSide ? (paginationConfig.total ?? 0) : total}
          totalPages={
            isServerSide
              ? Math.max(1, Math.ceil((paginationConfig.total ?? 0) / pageSize))
              : totalPages
          }
          onChange={handlePaginationChange}
          customRender={paginationConfig.render}
        />
      )}
    </div>
  );
}
