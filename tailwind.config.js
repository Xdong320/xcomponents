/** @type {import('tailwindcss').Config} */
/** 主题色与设计系统（与 index.css :root 对应） */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#7f58ea',
          50: '#e8e7fa',
          400: '#b39feb',
        },
        success: '#52c41a',
        warning: '#faad14',
        error: '#ff4d4f',
        info: '#7f58ea',
        // text、background
        0: '#fff',
        50: '#f5f7fa',
        100: '#eff3f7',
        200: '#e2e8f0',
        300: '#d3dbe6',
        400: '#90a1b9',
        600: '#45556c',
        950: '#0f172b',
        'sub-600': '#525866',
        'stroke-200': '#e2e8f0',
        'icon-300': '#d3dbe6',
      },
      borderRadius: {
        'card': '16px',
        'table': '8px',
        'btn': '12px',
        'tag': '6px',
      },
      boxShadow: {
        'small': '0px 2px 4px 0px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
