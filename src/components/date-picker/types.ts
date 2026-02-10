/** 日期范围 [开始, 结束]，可为单日或区间 */
export type DateRange = [Date | null, Date | null];

/** 快捷周期类型（含自定义、过去N天含今天、过去N天截止昨天） */
export type PresetKey = 'custom' | 'today' | 'yesterday' | 'last7' | 'last30' | 'lastN' | 'lastNExcludeToday';

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
}
