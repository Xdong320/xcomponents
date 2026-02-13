import React from "react";
import { createRoot } from "react-dom/client";
import { TableDemo } from "./examples/TableDemo";
import { DatePickerDemo } from "./examples/DatePickerDemo";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <div className="flex flex-row gap-4">
        <div className="w-full h-200 bg-red-500">1</div>
        <div>
          {/* <TableDemo /> */}
          <TableDemo />
        </div>
      </div>

      {/* <DatePickerDemo /> */}
    </React.StrictMode>,
  );
}
