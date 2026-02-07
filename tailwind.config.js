/** @type {import('tailwindcss').Config} */
/** Figma 会话洞察 R21Buytyt8i60ytA9UIbhC */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        figma: {
          page: '#FCFDFD',
          surface: '#FFFFFF',
          'surface-alt': '#F5F7FA',
          'text-primary': '#0F172B',
          'text-secondary': '#45556C',
          border: '#E2E8F0',
          primary: '#7F58EA',
        },
      },
      fontSize: {
        'figma-paragraph': ['14px', { lineHeight: '1.43', letterSpacing: '0.04em', fontWeight: '400' }],
        'figma-label-sm': ['14px', { lineHeight: '1.43', letterSpacing: '0.04em', fontWeight: '500' }],
        'figma-label-md': ['16px', { lineHeight: '1.5', letterSpacing: '0.06em', fontWeight: '500' }],
      },
      borderRadius: {
        'figma-card': '16px',
        'figma-table': '8px',
        'figma-btn': '12px',
        'figma-tag': '6px',
      },
      boxShadow: {
        'figma-small': '0px 2px 4px 0px rgba(0, 0, 0, 0.08)',
      },
      letterSpacing: {
        'figma-sm': '0.04em',
        'figma-md': '0.06em',
      },
    },
  },
  plugins: [],
};
