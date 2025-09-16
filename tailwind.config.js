/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      'xs': '375px',      // iPhone SE, small phones
      'sm': '640px',      // Default sm
      'md': '768px',      // Default md, tablets
      'lg': '1024px',     // Default lg, small laptops
      'xl': '1280px',     // Default xl, large laptops
      '2xl': '1536px',    // Default 2xl, desktops
      'mobile': '430px',  // iPhone 15 Pro Max width
      'tablet': '834px',  // iPad width
      'desktop': '1440px', // Common desktop resolution
    },
    extend: {
      fontFamily: {
        sans: ['Mabry', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sns: ['SNS', 'Mabry', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        sns: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#06A478',
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#022c22',
        },
        'sns-green': '#06A478', // Добавляем отдельный цвет для совместимости
        'sns-green-light': '#4ade80', // Светлый вариант для градиентов
        'sns-green-dark': '#047857', // Темный вариант
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#06A478',
          600: '#047857',
          700: '#065f46',
          800: '#064e3b',
          900: '#022c22',
        }
      },
      borderRadius: {
        'squircle': '12px',
        'squircle-sm': '8px',
        'squircle-lg': '16px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'sns-glow': '0 8px 32px rgba(6, 164, 120, 0.12)',
        'sns-soft': '0 4px 20px rgba(6, 164, 120, 0.08)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
        'bounce-gentle': 'bounceGentle 1s ease-in-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-10px)' },
          '60%': { transform: 'translateY(-5px)' },
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        'touch': '44px',
        'touch-lg': '48px',
      },
    },
  },
  plugins: [
    // Кастомный плагин для мобильных утилит
    function({ addUtilities }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.prevent-zoom': {
          'touch-action': 'manipulation',
          'user-select': 'none',
          '-webkit-user-select': 'none',
          '-webkit-touch-callout': 'none',
        },
        '.ios-momentum-scroll': {
          '-webkit-overflow-scrolling': 'touch',
        },
        '.safe-area-full': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
          'padding-right': 'env(safe-area-inset-right)',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};