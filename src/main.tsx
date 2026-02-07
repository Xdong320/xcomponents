import React from 'react';
import { createRoot } from 'react-dom/client';
import { TableDemo } from './examples/TableDemo';
import './index.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <TableDemo />
    </React.StrictMode>,
  );
}
