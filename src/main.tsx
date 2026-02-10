import React from "react";
import { createRoot } from "react-dom/client";
import { TableDemo } from "./examples/TableDemo";
import { DatePickerDemo } from "./examples/DatePickerDemo";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <TableDemo />
      {/* <DatePickerDemo /> */}
    </React.StrictMode>,
  );
}
