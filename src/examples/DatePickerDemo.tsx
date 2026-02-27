import React, { useState } from "react";
import {
  DatePicker,
  RangeDatePicker,
  type DateRange,
  type Placement,
} from "../components/date-picker";

function formatRange(range: DateRange): string {
  const [s, e] = range;
  if (!s) return "未选择";
  const f = (d: Date) =>
    `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  if (!e || s.getTime() === e.getTime()) return f(s);
  return `${f(s)} —— ${f(e)}`;
}

const PLACEMENTS: Placement[] = [
  "bottomLeft",
  "bottomRight",
  "topLeft",
  "topRight",
];

export function DatePickerDemo() {
  const [value, setValue] = useState<DateRange>([null, null]);
  const [placement, setPlacement] = useState<Placement>("bottomLeft");

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

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: "#45556C" }}>
          RangeDatePicker（弹窗）
        </h3>
        <div
          style={{
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: 14, color: "#45556C" }}>placement：</label>
          {PLACEMENTS.map((p) => (
            <label
              key={p}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="placement"
                value={p}
                checked={placement === p}
                onChange={() => setPlacement(p)}
              />
              <span style={{ fontSize: 14 }}>{p}</span>
            </label>
          ))}
        </div>
        <RangeDatePicker
          className="w-[600px]"
          border={true}
          placeholder={["Outlined Start", "Outlined End"]}
          placement={placement}
          value={value}
          onChange={setValue}
          disabledDate={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date.getTime() > today.getTime();
          }}
        />
      </div>

      {/* <div>
        <h3 style={{ fontSize: 14, marginBottom: 8, color: "#45556C" }}>
          内联 DatePicker
        </h3>
        <DatePicker
          value={value}
          onChange={setValue}
          disabledDate={(date) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return date.getTime() > today.getTime();
          }}
        />
      </div> */}
    </div>
  );
}
