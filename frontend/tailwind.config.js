/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        locus: {
          canvas: '#070B14',
          panel: '#0F172A',
          elevated: '#1E293B',
          cyan: '#38BDF8',
          indigo: '#6366F1',
          observed: '#10B981',
          database: '#3B82F6',
          inferred: '#F59E0B',
          predicted: '#A855F7',
        },
      },
    },
  },
  plugins: [],
};
