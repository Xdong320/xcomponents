# 表格组件 (Table Components)

基于 React + TypeScript + Tailwind 的公共表格能力，API 对齐 antd Table 常用字段，支持基础渲染、排序、列筛选、行选择、固定列。**分页**与**筛选条件**不集成在 CommonTable 内，需用时分别单独引用 `TablePagination`、`FilterBuilder` 与表格组合。

---

## 导出

| 组件 / 类型 | 说明 |
|-------------|------|
| `CommonTable` | 主表格组件 |
| `TablePagination` | 分页组件，**不集成在 CommonTable 内，需用时单独引用**（通常放在表格下方） |
| `FilterBuilder` | 筛选条件组件（标签条 + 弹窗），**不集成在 CommonTable 内，需用时单独引用** |
| `ColumnSettings` | 列显示/隐藏设置 |
| `CommonTableProps`, `CommonColumnType`, `PaginationConfig`, `PaginationRenderProps`, `RowSelection`, `SorterResult`, `SortOrder`, `TableFilters`, `TableLocale` | 表格相关类型 |
| `TablePaginationProps` | 分页组件 Props（`current`, `pageSize`, `total`, `totalPages`, `onChange`, `customRender?`, `pageSizeOptions?`） |
| `FilterBuilderProps`, `FilterCondition`, `FilterConditionDateValue`, `FilterFieldMeta`, `FilterFieldType`, `SavedFilterPreset` | 筛选相关类型 |
| `ColumnSettingsProps`, `Key` | 列设置与通用类型 |

---

## CommonTable

主表格，支持排序、列筛选、行选择、列设置、表头/列固定。**分页**仅通过 `pagination` 控制当前页/每页条数等数据行为（切片或服务端），不渲染分页栏；需分页 UI 时在页面中单独引用 `TablePagination` 并与之联动。筛选条件需单独使用 `FilterBuilder`。标题与「列设置」按钮同一行（左标题、右搜索+列设置）。

### 基础用法

```tsx
import { CommonTable, type CommonColumnType } from '@/components/table';

const columns: CommonColumnType<Record>[] = [
  { key: 'id', dataIndex: 'id', title: 'ID', width: 80 },
  { key: 'name', dataIndex: 'name', title: '名称' },
];

<CommonTable
  columns={columns}
  dataSource={data}
  rowKey="id"
  pagination={{ current: 1, pageSize: 10 }}
/>
```

### 常用 Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `columns` | `CommonColumnType<T>[]` | 列配置 |
| `dataSource` | `T[]` | 数据源 |
| `rowKey` | `string \| (record) => Key` | 行唯一键，默认 `"key"` |
| `pagination` | `PaginationConfig \| false` | 分页**数据**配置：`current`/`pageSize`/`total?`/`serverSide?`/`onChange`，控制表格展示哪一页；`false` 表示不切片、展示全部数据。分页 **UI** 需在页面中单独使用 `TablePagination` |
| `rowSelection` | `RowSelection<T>` | 行多选/单选 |
| `loading` | `boolean` | 加载中 |
| `bordered` | `boolean` | 是否显示边框，默认 `true` |
| `size` | `'small' \| 'middle' \| 'large'` | 尺寸 |
| `title` | `ReactNode` | 表格左上角标题 |
| `searchPlaceholder` | `string` | 搜索框占位符 |
| `searchValue` | `string` | 受控搜索值 |
| `onSearchChange` | `(value: string) => void` | 搜索变更 |
| `columnSettingsProps` | `Partial<ColumnSettingsProps<T>>` | 列设置配置 |
| `scroll` | `{ x?: number \| string; y?: number \| string }` | 表头/列固定：`y` 可视高度，`x` 横向滚动宽度 |
| `locale` | `TableLocale` | `emptyText` / `loadingText` |
| `onChange` | `(pagination, filters, sorter, extra) => void` | 分页/筛选/排序变化回调 |

### 列配置 CommonColumnType

| 属性 | 类型 | 说明 |
|------|------|------|
| `key` | `Key` | 列唯一键 |
| `dataIndex` | `string` | 字段路径，支持 `'a.b'` |
| `title` | `ReactNode` | 表头 |
| `width` / `minWidth` | `number \| string` | 列宽 / 最小宽 |
| `align` | `'left' \| 'right' \| 'center'` | 对齐 |
| `fixed` | `'left' \| 'right'` | 固定列（需配合 `scroll.x`，仅横向溢出时生效） |
| `sorter` | `boolean \| (a, b) => number` | 排序 |
| `filters` | `{ text, value }[]` | 列头筛选选项 |
| `onFilter` | `(value, record) => boolean` | 筛选逻辑 |
| `render` | `(value, record, index) => ReactNode` | 单元格渲染 |
| `children` | `CommonColumnType<T>[]` | 表头分组子列 |

### 固定列与滚动

- **表头固定**：传 `scroll={{ y: 400 }}`，表头在可视区内固定。
- **列固定**：传 `scroll={{ x: 1200 }}`，列配置 `fixed: 'left'` / `'right'`；仅在存在横向溢出时生效，否则为普通列。
- **行选择列固定**：`rowSelection.fixed: 'left' | 'right'`。
- 固定列边缘在横向滚动时会显示阴影；表头与表体共用同一滚动容器，纵向滚动同步。

---

## TablePagination

分页组件：上一页/下一页箭头、页码（含省略号）、每页条数下拉。**不集成在 CommonTable 内**，需要分页栏时在页面中单独引用，通常放在表格下方；将 `current`/`pageSize`/`total`/`totalPages` 与表格的 `pagination` 及数据源联动，`onChange` 更新父组件 state 后回传给 CommonTable 的 `pagination`。

| 属性 | 类型 | 说明 |
|------|------|------|
| `current` | `number` | 当前页（从 1 开始） |
| `pageSize` | `number` | 每页条数 |
| `total` | `number` | 总条数 |
| `totalPages` | `number` | 总页数 |
| `onChange` | `(page, pageSize) => void` | 页码或每页条数变更 |
| `customRender` | `(props: PaginationRenderProps) => ReactNode` | 传入时仅渲染自定义 UI，不渲染默认分页栏 |
| `pageSizeOptions` | `number[]` | 每页条数选项，默认 `[10, 20, 50, 100]` |

---

## FilterBuilder

筛选条件组件：加号展开「已保存筛选 + 表格字段」列表，按类型弹窗编辑，应用后以标签回显，支持保存到 localStorage。**不集成在 CommonTable 中**，需要筛选能力时在页面里单独引用，通常放在表格上方，将 `value` / `onChange` 与表格数据或接口联动。

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 唯一标识，用于 localStorage key |
| `fields` | `FilterFieldMeta[]` | 可筛字段（含类型、操作符、选项） |
| `value` | `FilterCondition[]` | 当前条件（受控） |
| `onChange` | `(conditions: FilterCondition[]) => void` | 条件变更 |
| `variant` | `'bar' \| 'panel'` | 展示形态，默认 `'bar'` |
| `formatConditionLabel` | `(condition) => string` | 标签文案，如「会话时长 > 110s」 |

### 字段类型与弹窗

- **date**：before/after + 日期（MM/DD/YYYY）+ 时间（HH:mm）。
- **number**：大于、小于、等于等 + 数字输入。
- **text**：包含、等于、不等于等 + 文本输入。
- **select**：单选选项；**boolean**：是/否。
- 类型可通过 `FilterFieldMeta.type` 扩展。

### 保存与回显

- 点击筛选栏右侧「保存」→ 输入名称 → 以 `SavedFilterPreset` 写入 localStorage。
- 点击加号展开列表：上方为已保存筛选（带删除），下方为表格字段；选已保存项会将该组合条件回显到筛选栏并触发 `onChange`。

### 与 CommonTable、TablePagination 一起使用

在页面中单独渲染 FilterBuilder、CommonTable、TablePagination；用 FilterBuilder 的 `value`/`onChange` 驱动过滤数据，用分页 state 驱动 CommonTable 的 `pagination` 与 TablePagination 的 props。

```tsx
const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const filteredData = useMemo(() => applyFilters(data, filterConditions), [data, filterConditions]);
const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

<div className="flex flex-col gap-4">
  <FilterBuilder id="my-filter" fields={filterFields} value={filterConditions} onChange={setFilterConditions} variant="bar" formatConditionLabel={formatFilterLabel} />
  <CommonTable
    columns={columns}
    dataSource={filteredData}
    rowKey="id"
    pagination={{ current: page, pageSize, serverSide: false, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
  />
  <TablePagination current={page} pageSize={pageSize} total={filteredData.length} totalPages={totalPages} onChange={(p, s) => { setPage(p); setPageSize(s); }} />
</div>
```

---

## ColumnSettings

列显示/隐藏：勾选列、全选/清空，用于 `CommonTable` 的 `columnSettingsProps`。

### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `allColumns` | `CommonColumnType<T>[]` | 全部列 |
| `visibleKeys` | `Key[]` | 当前可见列 key |
| `onChange` | `(visibleKeys: Key[]) => void` | 可见列变更 |

---

## 类型速查

- **PaginationConfig**：`current`, `pageSize`, `total?`, `serverSide?`, `onChange?`（仅控制数据；分页 UI 用 TablePagination 单独渲染）
- **PaginationRenderProps**：`current`, `pageSize`, `total`, `totalPages`, `onChange(page, pageSize)`
- **TablePaginationProps**：与 PaginationRenderProps 同源数据 + `customRender?`, `pageSizeOptions?`
- **RowSelection**：`type?`, `selectedRowKeys?`, `preserveSelectedRowKeys?`, `fixed?`, `onChange?`
- **TableLocale**：`emptyText?`, `loadingText?`
- **FilterCondition**：`field`, `label`, `type`, `operator`, `value`
- **FilterConditionDateValue**：`when?`, `date?`, `time?`（date 类型 value）
- **SavedFilterPreset**：`id`, `name`, `conditions`

---

## 示例

完整用法见项目内 `src/examples/TableDemo.tsx`：FilterBuilder 在表格上方、TablePagination 在表格下方单独引用，列定义、固定列、列设置、分页及筛选条件与表格数据联动（取交集过滤）。

---

## 测试与边界情况

- **测试清单与边界说明**：见 [TESTING.md](./TESTING.md)，含建议测试场景、已修复边界问题及已知限制。
- **已处理边界**：分页当前页超出总页数时自动回到有效页；行 `rowKey` 缺失时用索引兜底避免重复 key。

---

## 文档维护

组件有变动时请同步更新本 README 与 [TESTING.md](./TESTING.md)：导出、Props、用法示例及测试场景。
