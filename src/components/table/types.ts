import type React from 'react';

export type Key = React.Key;

export type FilterFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'date'
  | 'dateRange'
  | 'boolean';

export interface FilterFieldMeta {
  field: string;
  label: string;
  type: FilterFieldType;
  operators?: string[];
  options?: Array<{ label: string; value: string | number | boolean }>;
}

export interface FilterCondition {
  field: string;
  label: string;
  type: FilterFieldType;
  operator: string;
  value: any;
}

/** date 类型 value：before/after + 日期 + 时间 */
export interface FilterConditionDateValue {
  when?: 'before' | 'after';
  date?: string; // MM/DD/YYYY
  time?: string; // HH:mm
}

/** 已保存的筛选组合（localStorage） */
export interface SavedFilterPreset {
  id: string;
  name: string;
  conditions: FilterCondition[];
}

export interface FilterBuilderProps {
  id: string;
  fields: FilterFieldMeta[];
  value?: FilterCondition[];
  onChange?: (conditions: FilterCondition[]) => void;
  /** 展示形态：bar = 标签条 + 添加按钮，panel = 完整表单 */
  variant?: 'bar' | 'panel';
  /** 标签文案，如 "会话时长 > 110s" */
  formatConditionLabel?: (condition: FilterCondition) => string;
}

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total?: number;
  serverSide?: boolean;
  onChange?: (page: number, pageSize: number) => void;
}

export type SortOrder = 'ascend' | 'descend' | null;

export interface SorterResult<T = any> {
  field?: string;
  order?: SortOrder;
  column?: CommonColumnType<T>;
}

export interface TableFilters {
  [dataIndex: string]: React.Key[] | null;
}

export interface RowSelection<T = any> {
  type?: 'checkbox' | 'radio';
  selectedRowKeys?: Key[];
  preserveSelectedRowKeys?: boolean;
  onChange?: (selectedRowKeys: Key[], selectedRows: T[]) => void;
}

export interface CommonColumnType<T = any> {
  key?: React.Key;
  dataIndex?: string;
  title?: React.ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  sorter?: boolean | ((a: T, b: T) => number);
  defaultSortOrder?: SortOrder;
  sortDirections?: SortOrder[];
  filters?: Array<{ text: React.ReactNode; value: React.Key }>;
  filterMultiple?: boolean;
  onFilter?: (value: React.Key, record: T) => boolean;
  ellipsis?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface ColumnSettingsProps<T = any> {
  allColumns: CommonColumnType<T>[];
  visibleKeys: React.Key[];
  onChange: (visibleKeys: React.Key[]) => void;
}

export interface CommonTableOnChangePagination extends PaginationConfig {}

export interface CommonTableOnChangeExtra<T = any> {
  currentDataSource: T[];
}

export interface CommonTableProps<T = any> {
  columns: CommonColumnType<T>[];
  dataSource: T[];
  rowKey?: string | ((record: T) => Key);
  pagination?: PaginationConfig | false;
  rowSelection?: RowSelection<T>;
  loading?: boolean;
  bordered?: boolean;
  size?: 'small' | 'middle' | 'large';
  /** 表格左上角标题，如「会话列表」 */
  title?: React.ReactNode;
  /** 搜索框占位符；与 onSearchChange 一起使用 */
  searchPlaceholder?: string;
  /** 受控搜索值 */
  searchValue?: string;
  /** 搜索变更回调 */
  onSearchChange?: (value: string) => void;
  filterBuilderProps?: FilterBuilderProps;
  columnSettingsProps?: Partial<ColumnSettingsProps<T>>;
  onChange?: (
    pagination: CommonTableOnChangePagination,
    filters: TableFilters,
    sorter: SorterResult<T> | SorterResult<T>[],
    extra: CommonTableOnChangeExtra<T>
  ) => void;
}
