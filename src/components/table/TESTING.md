# 表格组件测试与边界情况说明

## 组件关系说明

- **CommonTable**：主表格，不含 FilterBuilder、不含分页栏。需要筛选时单独引用 FilterBuilder（通常放表格上方）；需要分页栏时单独引用 TablePagination（通常放表格下方），`pagination` 仅控制当前页/每页条数等数据行为。
- **TablePagination**：分页组件，不集成在 CommonTable 内，需用时单独引用并放在表格下方，与 `pagination` 的 current/pageSize/onChange 及数据源联动。
- **FilterBuilder**：筛选条件组件，不集成在 CommonTable 内，需用时单独引用并自行布局（如放在表格上方）。

---

## 已修复的边界问题

1. **分页当前页超出范围**  
   筛选或数据变少后，若当前页大于总页数，会显示空白行。已改为使用 `effectiveCurrentPage` 做 clamping，并在必要时同步内部页码；分页按钮与页码展示也按有效页计算。

2. **行 key 为 undefined**  
   `rowKey` 指向的字段缺失时，多行会得到 `undefined`，导致 React 重复 key 警告。已改为使用 `rowKey ?? index` 作为 `<tr>` 的 key，避免重复。

---

## 建议测试清单

### CommonTable 基础

| 场景 | 操作 | 预期 |
|------|------|------|
| 空数据 | `dataSource=[]` | 显示「暂无数据」，无报错 |
| 加载中 | `loading={true}` | 显示「加载中...」，无报错 |
| 单行数据 | 仅 1 条 | 正常渲染，分页显示 1/1 |
| 无列设置 | 不传 `columnSettingsProps` | 显示全部列 |
| 列设置清空 | 列设置里点「清空」 | 仅剩选择列（若有），空数据/加载行 colSpan 正确 |

### 分页（TablePagination 单独引用）

| 场景 | 操作 | 预期 |
|------|------|------|
| 第 5 页后筛选到 10 条 | 筛选使数据变少 | 页面侧将当前页 clamp 到有效页（如 1/1），不空白 |
| 切换每页条数 | 选 20 条/页 | TablePagination 与 CommonTable 的 pagination 联动，列表与页码一致 |
| 不需要分页 | 不传 `pagination` 或 `pagination={false}` 且不渲染 TablePagination | 表格展示全部数据，无分页栏 |

### 排序与列筛选

| 场景 | 操作 | 预期 |
|------|------|------|
| 点击排序 | 点列头排序图标 | 顺序变化，排序箭头状态正确 |
| 列头筛选 | 选筛选值 | 行按筛选条件过滤，表头筛选 UI 可关闭 |
| 无 sorter/filters | 列未配置排序/筛选 | 无排序/筛选 UI，无报错 |

### 行选择

| 场景 | 操作 | 预期 |
|------|------|------|
| 全选当前页 | 勾选表头 checkbox | 当前页全部选中，`onChange` 收到对应 keys |
| 跨页保留 | 选第 1 页几条后翻页 | `preserveSelectedRowKeys` 时仍保持已选 |
| 受控 | `selectedRowKeys` 传入 | 勾选状态与传入一致 |

### 固定列与滚动

| 场景 | 操作 | 预期 |
|------|------|------|
| 有横向滚动 | `scroll.x` 且内容宽 | 出现横向滚动条，固定列 sticky，边缘有阴影 |
| 无横向溢出 | 容器很宽 | 固定列不生效，表现为普通列 |
| 纵向滚动 | `scroll.y` | 表头固定，与表体同步滚动 |
| 先纵滚再横滚 | 先上下滑再左右滑 | 固定列阴影随横向滚动出现/消失 |

### FilterBuilder（单独引用，不集成在 CommonTable 内）

| 场景 | 操作 | 预期 |
|------|------|------|
| 加号展开 | 点击加号 | 出现「已保存筛选」+ 表格字段列表 |
| 选字段 | 选某字段 | 打开对应类型弹窗（date/number/text/select） |
| 应用条件 | 填值后点应用 | 条件以标签形式出现在筛选栏，`onChange` 触发 |
| 保存组合 | 输入名称保存 | localStorage 有记录，加号列表中出现 |
| 选已保存 | 点已保存项 | 条件回显到筛选栏，`onChange` 触发 |
| 删除已保存 | 点某条删除 | 从列表和 localStorage 移除 |
| 与表格联动 | 页面中 FilterBuilder 在上、CommonTable 在下 | 用 FilterBuilder 的 value/onChange 驱动过滤，将过滤后数据传给 CommonTable 的 dataSource |

### 样式与交互

| 场景 | 预期 |
|------|------|
| `bordered={true}` | 行列边框连续（collapse），无断线 |
| `bordered={false}` | 无外框与列竖线，保留行下划线等约定样式 |
| 表头/固定列 | 层级正确，滚动时内容不压住表头或固定列 |
| 空状态/加载 | 单行 colSpan 横跨全列，无固定列样式 |
| 搜索框 | 受控/非受控均可，占位符与 `onSearchChange` 正常 |

---

## 已知边界与说明

- **列设置清空**：可见列为空时，表格只保留选择列（若有），无数据列。可按产品需求在 ColumnSettings 中限制「至少保留一列」。
- **服务端分页**：`serverSide: true` 时，总条数来自 `pagination.total`，不做「当前页超出总页数」的自动 clamping，由后端与调用方保证。
- **rowKey 非唯一**：若数据中 `rowKey` 对应字段不唯一，仍可能重复 key，建议保证数据唯一或使用函数 `rowKey={(r) => r.id}`。
- **表头分组**：类型上支持 `children`，当前仍按单行表头渲染；多级表头需后续实现。

---

## 快速自测命令

在项目根目录执行：

```bash
npm run dev
```

打开示例页（FilterBuilder 在表格上方单独引用），按上表逐项操作（空数据、筛选到少量数据翻页、固定列横向滚动、筛选栏保存/回显等）做一次回归即可。

---

**维护**：组件有变动时请同步更新本 TESTING.md 与 [README.md](./README.md) 中的测试场景与说明。
