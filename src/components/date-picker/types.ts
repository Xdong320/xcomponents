/** 日期范围 [开始, 结束]，可为单日或区间 */
export type DateRange = [Date | null, Date | null];

/** 快捷周期类型（含自定义、过去N天含今天、过去N天截止昨天等） */
export type PresetKey =
  | 'custom'
  | 'today'
  | 'last24Hours'
  | 'yesterday'
  | 'thisMonth'
  | 'last7'
  | 'last30'
  | 'thisYear'
  | 'thisWeek'
  | 'lastN'
  | 'lastNExcludeToday';

export interface DatePickerProps {
  /** 当前选中的日期范围 */
  value?: DateRange;
  /** 选择变化回调 */
  onChange?: (range: DateRange) => void;
  /** 占位文案（当无选中时） */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 禁用某些日期（返回 true 表示该日期不可选） */
  disabledDate?: (date: Date) => boolean;
  /** 自定义类名 */
  className?: string;
  /** 年份范围配置：[开始年份, 结束年份]，默认为 [1970, 当前年份 + 50] */
  yearRange?: [number, number];
  /** 点击取消时回调（如弹窗形式下可在此关闭弹窗） */
  onCancel?: () => void;
}

/** 弹窗相对触发元素的方位 */
export type Placement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface RangeDatePickerProps {
  /** 当前选中的日期范围 */
  value?: DateRange;
  /** 选择变化回调 */
  onChange?: (range: DateRange) => void;
  /** 占位文案 [开始日期, 结束日期]，如 ['Outlined Start', 'Outlined End'] */
  placeholder?: [string, string];
  /** 弹窗方位，默认 bottomLeft */
  placement?: Placement;
  /** 是否禁用 */
  disabled?: boolean;
  /** 禁用某些日期 */
  disabledDate?: (date: Date) => boolean;
  /** 自定义类名，作用于触发框，可控制宽度（如 w-80）、边框颜色（如 border-blue-500）、边框样式（如 border-2 border-dashed）等 */
  className?: string;
  /** 年份范围配置 */
  yearRange?: [number, number];
  /** 是否显示触发框边框，默认 true */
  border?: boolean;
}
