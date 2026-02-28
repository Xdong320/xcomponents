# Code Review: Table 组件与 TableDemo

> 审查范围：`src/components/table/`、`src/examples/TableDemo.tsx`

---

## 一、总体评价

- **表格能力**：CommonTable 支持固定列、横向/纵向滚动、列设置、表头筛选/排序、行选择、自定义分页，与 FilterBuilder、TablePagination 组合完整。
- **类型**：`types.ts` 定义清晰，FilterCondition 的 `value` 使用 `any` 可后续收紧。
- **主要问题**：TableDemo 存在未使用导入、演示残留代码、筛选 operator 与 FilterBuilder 不一致；组件侧有少量可访问性与逻辑可优化点。

---

## 二、TableDemo.tsx

### 1. 未使用的导入（建议删除）

```ts
import { createPortal } from "react-dom";
```

`createPortal` 未使用，建议删除以免误导。

### 2. 演示/测试残留代码（建议清理或改为正式实现）

- **TitleComponent（约 134–183 行）**
  - 弹层内容为「test弹窗背遮挡问题」+「X」关闭，明显为测试遮挡问题用。
  - 建议：删除该示例，或改为正式「会话ID」说明/筛选等交互；若仅作占位，至少改为中性文案并加上 `role="dialog"` 与 `aria-label`。

- **会话ID 列复制按钮（约 199–217 行）**
  - 复制按钮无 `onClick`，未实现复制逻辑。
  - 建议：实现 `navigator.clipboard.writeText(val)` 或移除按钮，避免「可点但无效果」。

### 3. 筛选逻辑与 FilterBuilder 的 operator 不一致（Bug）

- **FilterBuilder**（`FilterBuilder.tsx`）中 `getOperatorsForType("number")` 返回的是**中文**：`["大于", "小于", "等于", "大于等于", "小于等于"]`。
- **TableDemo** 中 `filteredData` 的 number 分支（约 361–369 行）只处理了**符号**：`">"`, `"<"`, `">="`, `"<="`, `"等于"`。

因此，对**未**配置 `operators` 的 number 字段（如只设 `type: "number"`），条件里的 `operator` 会是「大于」等中文，在 TableDemo 里会走 `default: return true`，**等价于未筛选**。

**建议**：在 TableDemo 的 number 分支中同时支持中文与符号，例如：

```ts
// 统一 operator 到符号再比较，或直接支持中文
const opMap: Record<string, (a: number, b: number) => boolean> = {
  ">": (a, b) => a > b,
  "大于": (a, b) => a > b,
  "<": (a, b) => a < b,
  "小于": (a, b) => a < b,
  ">=": (a, b) => a >= b,
  "大于等于": (a, b) => a >= b,
  "<=": (a, b) => a <= b,
  "小于等于": (a, b) => a <= b,
  "=": (a, b) => a === b,
  "等于": (a, b) => a === b,
};
const fn = opMap[c.operator];
if (fn) return fn(num, v);
return true;
```

或抽成与 FilterBuilder 共用的 operator 常量/映射，避免两处各写一套。

### 4. 冗余/重复配置

- **filterFields** 中 `durationSeconds1`（约 105–118 行）与 `durationSeconds` 高度重复，仅用于演示「非 range」的 number 筛选；`operatorsText` 注释「仅影响展示」正确，但示例中保留两个时长字段易混淆。
- 建议：若不需要两个时长筛选项，可删 `durationSeconds1`；若保留，建议注释说明「仅演示单值 number 用」。

### 5. handleTableChange 参数类型

```ts
const handleTableChange = useCallback(
  (pagination: unknown, filters: unknown, sorter: unknown, extra: unknown) => {
    console.log("Table onChange", { pagination, filters, sorter, extra });
  },
  [],
);
```

建议改为使用 `CommonTableProps['onChange']` 的签名，便于类型安全与后续扩展：

```ts
const handleTableChange = useCallback(
  (
    pagination: CommonTableOnChangePagination,
    filters: TableFilters,
    sorter: SorterResult<SessionRecord> | SorterResult<SessionRecord>[],
    extra: CommonTableOnChangeExtra<SessionRecord>,
  ) => {
    console.log("Table onChange", { pagination, filters, sorter, extra });
  },
  [],
);
```

（需从 `../components/table` 引入上述类型。）

### 6. 分页与 totalPages 同步

```ts
useEffect(() => {
  if (paginationCurrent > paginationTotalPages) {
    setPaginationCurrent(paginationTotalPages);
  }
}, [paginationTotalPages, paginationCurrent]);
```

逻辑正确：筛选后总页数变少时把当前页拉回有效范围。注意 `paginationTotalPages` 最小为 1，无需额外处理 0。

---

## 三、CommonTable.tsx

### 1. 行选择与 dataSource / displayData

- `selectedRows` 来自 `dataSource.filter(...)`（约 434–440 行），即「当前数据源中被选中的行」，与是否分页、是否服务端一致，语义正确。
- 若未来需要「仅当前页选中的行」，可再提供单独回调或由调用方根据 `displayData` 与 `selectedRowKeys` 自行计算。

### 2. 表头筛选与 FilterBuilder 的关系

- CommonTable 表头筛选（`filters` + `onFilter`）与 FilterBuilder 是**两套独立筛选**：表头筛的是「当前数据列的下拉多选」，FilterBuilder 是「外部条件条」。
- TableDemo 只用了 FilterBuilder + 本地 `filteredData`，未把表头筛选和 FilterBuilder 条件打通，属于当前设计选择；若产品上需要「表头筛选与条件条同时生效」，需要在 Demo 里把 `filters` 也纳入 `filteredData`，或由服务端统一处理。

### 3. 可访问性

- 列设置、筛选下拉等用 `aria-hidden`、`aria-label` 的部分已有所考虑；表头「列设置」按钮可加 `aria-expanded={columnSettingsOpen}` 和 `aria-haspopup="true"`，便于屏幕阅读器。
- 固定列与滚动区域如能加上 `aria-label`（例如「表格可横向滚动」）会更好，非必须。

### 4. 性能

- `visibleColumns`、`columnLayout`、`filteredData`、`sortedData`、`displayData` 等均用 `useMemo` 依赖合理，无明显多余计算。
- 滚动用 `markScrolling` + 150ms 防抖更新 shadow 状态，避免频繁 setState，合理。

---

## 四、FilterBuilder.tsx

### 1. number 类型 operator 与展示

- 默认 number 使用中文 operator（「大于」「小于」等），与 `operatorsText` 仅影响展示的注释一致；若希望「存贮值」统一为符号（如 `">"`），可在 `createEmptyCondition` 或提交条件时做一层映射，便于 TableDemo 等消费者只处理一套值。

### 2. removeCondition 中的 onChange 调用位置

```ts
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
```

在 setState 的 updater 里调用 `onChange` 可行，但更常见的是先算 `next`，再 `setConditions(next)` 与 `onChange?.(next)`，逻辑更直观，也避免在 updater 中产生副作用。可考虑改为：

```ts
const next = prev.filter((_, i) => i !== index);
onChange?.(next);
return next;
```
或在外层先计算 `next` 再 `setConditions(next); onChange?.(next);`。

### 3. variant !== "bar" 的占位 UI

- 非 `bar` 时仅渲染「筛选条件（请使用 variant="bar"）」的占位，若长期只支持 `bar`，建议在类型或文档中说明，或为 `panel` 预留简单实现，避免误解为已支持。

---

## 五、TablePagination.tsx

### 1. 点击外部关闭逻辑

- 约 166–179 行：`if (!triggerEl && !dropdownEl) return;` 后仍执行 `setPageSizeOpen(false)`，在两者都不存在时也会关闭，逻辑正确；若存在多实例，需保证 ref 指向当前实例，当前为单组件使用无问题。

### 2. 每页条数下拉的定位

- 使用 `getBoundingClientRect()` + viewport 计算 `left` / `top` / `bottom`，避免溢出视口，实现合理；若父容器有 `transform`，可能影响 fixed 定位子元素，当前用法下一般无问题。

---

## 六、ColumnSettings.tsx

### 1. 列 title 的展示

- `col.title as any`（约 103 行）：当 `title` 为 ReactNode（如 `<TitleComponent />`）时，仅作 `truncate` 文本展示会看不到内容，可考虑：
  - 若为 string，直接显示；
  - 若为 ReactNode，显示如「自定义标题」或从 `col.key`/`col.dataIndex` 推导文案，避免 `as any` 并改善可读性。

### 2. 全选/清空按钮

- 全选/清空已注释，若产品不需要可保留注释并注明「暂不开放」；若需要，建议恢复并保证 `handleSelectAll` 与 `handleClear` 与 `allColumns` 的 key 来源一致（与 CommonTable 的 `getColumnKey` 一致更稳妥）。

---

## 七、types.ts

### 1. FilterCondition.value 类型

- 当前为 `any`；已知形状有：`FilterConditionDateValue`、`FilterConditionRangeValue`、string、number、boolean 等。
- 建议改为联合类型，例如：

```ts
export type FilterConditionValue =
  | FilterConditionDateValue
  | FilterConditionRangeValue
  | string
  | number
  | boolean
  | undefined;

export interface FilterCondition {
  field: string;
  label: string;
  type: FilterFieldType;
  operator: string;
  value: FilterConditionValue;
}
```

便于在 TableDemo 和 FilterBuilder 中做类型收窄，减少误用。

---

## 八、建议修复优先级

| 优先级 | 项 | 说明 |
|--------|----|------|
| 高 | TableDemo number 筛选 operator | 支持「大于」等中文，或与 FilterBuilder 统一为符号，否则部分 number 筛选不生效 |
| 中 | TableDemo 删除 createPortal / 清理 TitleComponent | 减少噪音与误导 |
| 中 | 会话ID 复制按钮 | 实现复制或移除 |
| 低 | handleTableChange 类型 | 使用 CommonTable 的 onChange 类型 |
| 低 | FilterCondition.value 联合类型 | 提升类型安全 |
| 低 | removeCondition 中 onChange 调用位置 | 风格与可读性 |

---

## 九、小结

- 表格与筛选、分页整体设计清晰，类型与注释到位，固定列与滚动体验考虑较全。
- 需要优先修复的是 **TableDemo 中 number 条件 operator 与 FilterBuilder 不一致** 导致的筛选失效，以及清理演示残留（未使用导入、测试弹窗、未实现复制按钮）。
- 其余为类型收紧、可访问性、代码风格与可维护性方面的改进，可按排期逐步做。
