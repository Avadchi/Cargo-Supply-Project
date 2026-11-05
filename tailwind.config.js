/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0C1B15',
          900: '#10241C',
          800: '#173429',
          700: '#1F4838',
          600: '#2A5D48',
          500: '#37745A',
        },
        canvas: '#F4F4ED',
        paper: '#FBFBF7',
        line: '#E1E3D8',
        lime: {
          300: '#E2FFA3',
          400: '#D4FA7C',
          500: '#C2F05C',
        },
        clay: '#E8794A',
        mist: '#8C958E',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'DM Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 36, 28, 0.04), 0 8px 24px -12px rgba(16, 36, 28, 0.12)',
        lift: '0 20px 50px -20px rgba(16, 36, 28, 0.28)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .35s cubic-bezier(.2,.7,.3,1) both',
        slideIn: 'slideIn .3s cubic-bezier(.2,.7,.3,1) both',
      },
    },
  },
  plugins: [],
}
