// 组件导出：默认推荐使用 <Table />，也保留 CommonTable 以兼容老代码
export { CommonTable, CommonTable as Table } from './CommonTable';
export { FilterBuilder } from './FilterBuilder';
export { ColumnSettings } from './ColumnSettings';
export { TablePagination } from './TablePagination';
export type {
  CommonTableProps,
  CommonColumnType,
  PaginationConfig,
  PaginationRenderProps,
  RowSelection,
  SorterResult,
  SortOrder,
  TableFilters,
  TableLocale,
  FilterBuilderProps,
  FilterCondition,
  FilterConditionDateValue,
  FilterFieldMeta,
  FilterFieldType,
  SavedFilterPreset,
  ColumnSettingsProps,
  Key,
} from './types';
export type { TablePaginationProps } from './TablePagination';
