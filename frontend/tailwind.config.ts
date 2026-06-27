import type { Config } from 'tailwindcss';

// Design tokens — tông tươi sáng, thân thiện (bản Phân tích v3)
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F86C6', // xanh dương nhẹ — nút chính, nav active
        secondary: '#F5A623', // cam ấm — badge điểm, highlight
        success: '#5BAD8F', // xanh lá pastel — điểm cao, hoàn thành
        danger: '#E07B6A', // đỏ nhạt — điểm thấp, cảnh báo
        background: '#F7F9FC', // nền trang trắng xanh nhạt
        card: '#FFFFFF',
      },
      borderRadius: {
        card: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'Nunito', 'system-ui', 'sans-serif'],
        display: ['Nunito', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
