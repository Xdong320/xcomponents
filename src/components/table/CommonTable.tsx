import React, { useCallback, useMemo, useState } from "react";
import { FilterBuilder } from "./FilterBuilder";
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
  onChange,
}: CommonTableProps<T>) {
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

  const [internalPagination, setInternalPagination] = useState({
    current:
      paginationProp && paginationProp !== false ? paginationProp.current : 1,
    pageSize:
      paginationProp && paginationProp !== false ? paginationProp.pageSize : 10,
  });

  const paginationConfig: PaginationConfig | false =
    paginationProp === false
      ? false
      : {
          ...(paginationProp || {}),
          current:
            paginationProp && "current" in paginationProp
              ? paginationProp.current
              : internalPagination.current,
          pageSize:
            paginationProp && "pageSize" in paginationProp
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
  const currentPage =
    paginationConfig && paginationConfig !== false
      ? paginationConfig.current
      : 1;
  const pageSize =
    paginationConfig && paginationConfig !== false
      ? paginationConfig.pageSize
      : 10;

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
  const displayData = useMemo(() => {
    if (isServerSide) return dataSource;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [isServerSide, dataSource, sortedData, currentPage, pageSize]);

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
      if (
        !("current" in paginationProp) ||
        paginationProp.current === undefined
      ) {
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
      if (
        !("current" in (paginationConfig || {})) ||
        paginationConfig?.current === undefined
      ) {
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
      setInternalPagination((prev) => ({ ...prev, current: 1 }));
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
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
        </div>
      </div>

      {filterBuilderProps && <FilterBuilder {...filterBuilderProps} />}

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1" />
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

      <div
        className={`overflow-x-auto rounded-figma-card bg-figma-surface pt-1 pb-1 shadow-figma-small ${bordered ? "border border-figma-border" : ""}`}
      >
        <table className={`-mt-1 -mb-1 w-full border-separate border-spacing-x-0 border-spacing-y-1 ${tableLayout}`}>
          <thead>
            <tr className="rounded-t-figma-table bg-figma-surface-alt">
              {rowSelectionProp && rowSelectionProp.type !== "radio" && (
                <th
                  className={`${borderR} ${borderB} ${rowSizeClass} text-left text-figma-paragraph text-figma-text-secondary`}
                  style={{ width: 40 }}
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
                  className={`${borderR} ${borderB} ${rowSizeClass} text-left text-figma-paragraph text-figma-text-secondary`}
                  style={{ width: 40 }}
                />
              )}
              {visibleColumns.map((col, colIndex) => {
                const key = getColumnKey(col, columns.indexOf(col));
                const hasSorter = col.sorter != null;
                const hasFilter = col.filters && col.filters.length > 0;
                const currentOrder =
                  sorter.field === key || sorter.field === col.dataIndex
                    ? sorter.order
                    : null;
                const filterOpen = filterDropdownOpen === String(key);

                return (
                  <th
                    key={key.toString()}
                    className={`${borderR} ${borderB} ${rowSizeClass} text-left text-figma-paragraph text-figma-text-secondary ${bordered ? "last:border-r-0" : ""}`}
                    style={
                      col.width
                        ? { width: col.width, minWidth: col.width }
                        : undefined
                    }
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
                  加载中...
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length + (rowSelectionProp ? 1 : 0)}
                  className={`${borderB} py-8 text-center text-figma-paragraph text-figma-text-secondary`}
                >
                  暂无数据
                </td>
              </tr>
            ) : (
              displayData.map((record, index) => {
                const key = getRowKey(record);
                const selected = selectedRowKeys.includes(key);
                return (
                  <tr
                    key={key.toString()}
                    className={`group cursor-pointer bg-figma-surface-alt ${selected ? "bg-figma-primary/5" : ""}`}
                  >
                    {rowSelectionProp && rowSelectionProp.type !== "radio" && (
                      <td className={`${borderR} ${borderB} bg-figma-surface px-3 py-3 group-hover:bg-gray-50`}>
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
                      <td className={`${borderR} ${borderB} bg-figma-surface px-3 py-3 group-hover:bg-gray-50`}>
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
                          className={`${borderR} ${borderB} bg-figma-surface ${cellSizeClass} text-figma-paragraph text-figma-text-primary group-hover:bg-gray-50 ${bordered ? "last:border-r-0" : ""}`}
                          style={
                            col.align ? { textAlign: col.align } : undefined
                          }
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

      {paginationConfig && paginationConfig !== false && (
        <div className="flex items-center justify-between gap-2 rounded-figma-card border border-figma-border bg-figma-surface px-4 py-3 text-figma-paragraph text-figma-text-secondary shadow-figma-small">
          <span>
            共 {isServerSide ? (paginationConfig.total ?? 0) : total} 条
          </span>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                handlePaginationChange(1, v);
              }}
              className="rounded-figma-btn border border-figma-border bg-figma-surface px-2.5 py-1.5 text-figma-paragraph text-figma-text-primary"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} 条/页
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => handlePaginationChange(currentPage - 1, pageSize)}
              className="rounded-figma-btn border border-figma-border px-2.5 py-1.5 text-figma-paragraph text-figma-text-secondary disabled:opacity-50 hover:bg-figma-surface-alt"
            >
              上一页
            </button>
            <span>
              {currentPage} /{" "}
              {Math.max(
                1,
                Math.ceil(
                  (isServerSide ? (paginationConfig.total ?? 0) : total) /
                    pageSize,
                ),
              )}
            </span>
            <button
              type="button"
              disabled={
                currentPage >=
                Math.ceil(
                  (isServerSide ? (paginationConfig.total ?? 0) : total) /
                    pageSize,
                )
              }
              onClick={() => handlePaginationChange(currentPage + 1, pageSize)}
              className="rounded-figma-btn border border-figma-border px-2.5 py-1.5 text-figma-paragraph text-figma-text-secondary disabled:opacity-50 hover:bg-figma-surface-alt"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
