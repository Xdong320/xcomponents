### 总览

`DatePicker` 是一个用于选择**日期范围**的组件，支持：

- **跨天范围选择**（起止日期）
- 多种**快捷日期预设**（今天 / 昨天 / 最近7天 / 最近30天 / 过去 N 天 等）
- **年份范围配置**（`yearRange`）
- **不可选日期控制**（`disabledDate`）
- 受控组件用法（通过 `value` + `onChange` 管理）

### 基本用法

```tsx
import React, { useState } from "react";
import { DatePicker, type DateRange } from "../components/date-picker";

export function DatePickerDemo() {
  const [value, setValue] = useState<DateRange>([null, null]);

  return (
    <div style={{ padding: 24 }}>
      <DatePicker value={value} onChange={setValue} />
    </div>
  );
}
```

- **`DateRange` 类型**：`[Date | null, Date | null]`，分别表示 `[开始日期, 结束日期]`
- 初始值一般为 `[null, null]`，表示未选择

### Props 说明（`DatePickerProps`）

```ts
export type DateRange = [Date | null, Date | null];

export interface DatePickerProps {
  /** 当前选中的日期范围（受控） */
  value?: DateRange;
  /** 选择变化回调 */
  onChange?: (range: DateRange) => void;
  /** 占位文案（当无选中时） */
  placeholder?: string;
  /** 整体禁用 */
  disabled?: boolean;
  /** 禁用某些日期（返回 true 表示该日期不可选） */
  disabledDate?: (date: Date) => boolean;
  /** 自定义外层 className（用于套 Tailwind 等） */
  className?: string;
  /** 年份范围配置：[开始年份, 结束年份]，默认为 [1970, 当前年份 + 50] */
  yearRange?: [number, number];
}
```

#### 1. `value?: DateRange`

- 当前选中范围，受控属性
- 结构：`[start, end]`
  - `start`：开始日期，`Date | null`
  - `end`：结束日期，`Date | null`
- 当 `end === null` 时，表示正在选区间的第二个点（只选了开始）

#### 2. `onChange?: (range: DateRange) => void`

- 每次用户点击日期 / 使用快捷项 / 输入框修改时触发
- 参数为新的 `[start, end]`
- 一般用法：

```tsx
const [value, setValue] = useState<DateRange>([null, null]);

<DatePicker value={value} onChange={setValue} />;
```

#### 3. `placeholder?: string`

- 顶部 “开始日期 / 结束日期” 文本框的占位文案（当前用的是固定 `"YYYY/MM/DD"`，预留扩展）

#### 4. `disabled?: boolean`

- 整个组件禁用（目前预留，尚未完全接入内部交互，可在后续扩展）
- 预期效果：
  - 所有按钮、输入框不可点击
  - 样式变为禁用态

#### 5. `disabledDate?: (date: Date) => boolean`

- **按天粒度禁用日期**，核心能力之一
- 函数返回：
  - `true`：该日期不可选，按钮禁用，显示为灰色且无 hover 效果
  - `false` / `undefined`：正常可选
- 组件内部会：
  - 在点击前调用：`if (disabledDate?.(d)) return;`
  - 给按钮加 `disabled`、修改颜色和鼠标样式

**示例：只允许选择“今天及之前”的日期**

```tsx
<DatePicker
  value={value}
  onChange={setValue}
  disabledDate={(date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime(); // 今天之后的日期禁用
  }}
/>
```

**示例：禁用周末**

```tsx
<DatePicker
  value={value}
  onChange={setValue}
  disabledDate={(date) => {
    const day = date.getDay(); // 0: 周日, 6: 周六
    return day === 0 || day === 6;
  }}
/>
```

#### 6. `className?: string`

- 追加到组件最外层容器，方便在外部控制宽度、边距等

```tsx
<DatePicker value={value} onChange={setValue} className="mt-4 shadow-lg" />
```

#### 7. `yearRange?: [number, number]`

- 控制顶部“选择年份”弹窗中可选年份的范围
- 默认：`[1970, 当前年份 + 50]`
- 内部逻辑会遍历此区间生成年份列表，并且在弹出时自动滚动到当前年份附近

**示例：只允许 2000–2030 年**

```tsx
<DatePicker value={value} onChange={setValue} yearRange={[2000, 2030]} />
```

### 快捷日期预设说明

左侧预设项包括：

- **自定义**：不修改当前选择，仅作为默认高亮
- **今天**
- **昨天**
- **最近7天**
- **最近30天**
- **过去 N 天（含今天）**
- **过去 N 天（截止昨天）**

行为：

- 点击固定预设项（如“今天”、“最近7天”）：
  - 内部通过 `getPresetRange(key)` 计算 `[start, end]`
  - 调用 `onChange?.([start, end])`
  - 自动把右侧日历跳转到开始日期所在的年月
- “过去 N 天” 两项：
  - N 由右侧的 `input` 控制
  - 支持直接输入、回车、或失焦时自动应用
  - 仍然通过 `onChange` 返回新的区间

### 用户手动输入开始/结束日期

- 顶部有两个文本框：
  - 开始日期：`startInputValue`
  - 结束日期：`endInputValue`
- 支持格式：`YYYY/MM/DD`（内部使用 `parseDateInput` 解析）
- 行为：
  - `onBlur` 或按 Enter 时提交
  - 若用户输入的开始 > 当前结束，会自动调整为 `[start, start]`
  - 若输入的结束 < 当前开始，会调整为 `[start, end]` 合理顺序
  - 同步更新日历视图的 `viewYear`、`viewMonth`

### 年份选择弹窗交互

- 点击中部 `2026年 2月 ▾` 区域，会打开年份选择面板
- 年份列表：
  - 范围由 `yearRange` 控制
  - 自动滚动：弹出时，内部会滚动，使当前 `viewYear` 尽量位于可视区域中间
- 标题“选择年份”固定在弹窗顶部，列表可滚动
- 滚动条被圆角容器裁剪，不会溢出

### 日期范围选择规则

- **第一次点击某天**：
  - 若当前无开始日期，或已有完整区间（`[start, end]` 都不为 `null`）：
    - 设置为 `[clickedDate, null]`，开始选择新的区间
- **第二次点击某天**：
  - 若 `clickedDate < start`：自动调整为 `[clickedDate, start]`
  - 否则：`[start, clickedDate]`
- 视觉上：
  - 起点 / 终点：实心紫色圆角块
  - 中间范围：浅紫色背景条，连续连接起止两端，且边界与圆角对齐

### 综合示例

```tsx
import React, { useState } from "react";
import { DatePicker, type DateRange } from "../components/date-picker";

export function AdvancedDatePickerDemo() {
  const [value, setValue] = useState<DateRange>([null, null]);

  return (
    <div style={{ padding: 24 }}>
      <p style={{ marginBottom: 16 }}>
        当前选中：
        {value[0]?.toISOString().slice(0, 10) ?? "未选择"} {" - "}
        {value[1]?.toISOString().slice(0, 10) ?? "未选择"}
      </p>

      <DatePicker
        value={value}
        onChange={setValue}
        yearRange={[2000, 2035]}
        disabledDate={(date) => {
          // 禁用今天之后的日期 + 周末
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isFuture = date.getTime() > today.getTime();
          const day = date.getDay();
          const isWeekend = day === 0 || day === 6;
          return isFuture || isWeekend;
        }}
        className="shadow-md"
      />
    </div>
  );
}
```

---

如果你希望这份说明变成一个正式的 `README` 或放到组件文档站里，我可以帮你直接生成对应的 markdown 文件内容（带目录、示例截图占位等）。
