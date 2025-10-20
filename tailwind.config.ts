import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#E50012', // ゲームレッド
        'gray-900': '#111827',
        'gray-100': '#F3F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'Hiragino Sans', 'sans-serif'],
      },
      spacing: {
        '11': '2.75rem', // 44px（最小タップ領域）
      },
    },
  },
  plugins: [],
};

export default config;
