import React, { useState } from "react";
import { DatePicker, type DateRange } from "../components/date-picker";

function formatRange(range: DateRange): string {
  const [s, e] = range;
  if (!s) return "未选择";
  const f = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  if (!e || s.getTime() === e.getTime()) return f(s);
  return `${f(s)} —— ${f(e)}`;
}

export function DatePickerDemo() {
  const [value, setValue] = useState<DateRange>([null, null]);

  return (
    <div style={{ padding: 24, fontFamily: '"Noto Sans SC", sans-serif' }}>
      <h2
        style={{
          marginBottom: 16,
          fontSize: 16,
          fontWeight: 500,
          color: "#0F172B",
        }}
      >
        日期选择-跨越式1
      </h2>
      <p style={{ marginBottom: 16, fontSize: 14, color: "#45556C" }}>
        当前选中：{formatRange(value)}
      </p>
      <DatePicker
        value={value}
        onChange={setValue}
        // 示例：限制可选年份范围
        // yearRange={[1970, 2050]}
        // 示例：禁用今天之后的所有日期（仅可选今天及以前）
        disabledDate={(date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return date.getTime() > today.getTime();
        }}
      />
    </div>
  );
}
