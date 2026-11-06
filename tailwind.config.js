/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
    },
    extend: {
      colors: {
        ground: '#171719',
        surface: '#131217',
        raised: '#212023',
        rule: '#1b1a1f',
        control: '#3a3a3e',
        ink: '#ffffff',
        muted: '#8a8c92',
        faint: '#636469',
        accent: {
          DEFAULT: '#4a8ad6',
          weak: '#2a4a74',
        },
        positive: {
          DEFAULT: '#44a282',
          bg: '#1b2828',
          ink: '#5fc39c',
        },
        negative: {
          DEFAULT: '#e5566f',
          bg: '#2c1a20',
          ink: '#e5566f',
        },
        warning: {
          DEFAULT: '#d9a441',
          bg: '#2a2416',
          ink: '#d9a441',
        },
        pill: {
          bg: '#212023',
          ink: '#bdbdc0',
        },
        orange: {
          DEFAULT: '#f06a6a',
          ink: '#f9736a',
          bg: '#2a1016',
        },
        author: '#e8a87c',
      },
      borderColor: {
        DEFAULT: '#222224',
        rule: '#1b1a1f',
        control: '#3a3a3e',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        meta: ['12px', { lineHeight: '16px', letterSpacing: '0' }],
        body: ['13px', { lineHeight: '18px', letterSpacing: '0' }],
        label: ['14px', { lineHeight: '20px' }],
        section: ['20px', { lineHeight: '26px' }],
        kpi: ['20px', { lineHeight: '24px' }],
        title: ['26px', { lineHeight: '32px', letterSpacing: '-0.01em' }],
      },
      spacing: {
        rail: '50px',
        row: '42px',
        'row-tight': '36px',
        'row-media': '72px',
        pad: '32px',
        gap: '24px',
      },
      borderRadius: {
        card: '6px',
        control: '999px',
        chip: '4px',
      },
      boxShadow: {
        raised: '0 12px 28px rgba(0,0,0,0.2)',
        focus: '0 0 0 2px #171719, 0 0 0 4px #4a8ad6',
      },
      ringColor: {
        DEFAULT: '#4a8ad6',
      },
      outlineColor: {
        DEFAULT: '#4a8ad6',
      },
    },
  },
  plugins: [],
};
