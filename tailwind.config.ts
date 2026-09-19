import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 1. Exact Civic & Flag Color Palette
      colors: {
        navy: {
          DEFAULT: '#0E1E3B',
          dark: '#070F1E',
          light: '#162B54',
          muted: '#1E3A8A',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E2BC3E',
          dark: '#9A7B1D',
        },
        flag: {
          red: '#CE1126',
          yellow: '#FCD116',
          green: '#006B3F',
          'green-dark': '#004D2C',
          'green-light': '#008750',
        },
        civic: {
          slate: '#F8FAFC',
          border: '#E2E8F0',
          muted: '#64748B',
          ink: '#0F172A',
        },
      },

      // 2. Typography & Font Families
      fontFamily: {
        heading: ['var(--font-heading)', 'Montserrat', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'sans-serif'],
      },

      // 3. Deliberate 7-Step Architectural Type Scale (Sizes + Line Heights)
      fontSize: {
        // Step 1: Micro / Legal / Meta disclaimers
        xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }], // 12px / 18px
        // Step 2: UI Captions, subtext, badges
        sm: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.005em' }], // 14px / 22px
        // Step 3: Core Civic Body text (optimized for 65-75ch line length)
        base: ['1rem', { lineHeight: '1.625rem', letterSpacing: '0' }], // 16px / 26px
        // Step 4: Lead paragraph, subheadings, key callouts
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 18px / 28px
        // Step 5: Card titles, secondary section headings (H3)
        xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.015em' }], // 20px / 30px
        // Step 6: Section headers, major category banners (H2)
        '2xl': ['1.5rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }], // 24px / 34px
        // Step 7: Page titles, Hero display headings (H1)
        '3xl': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.025em' }], // 30px / 38px
        '4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.03em' }], // 36px / 44px
        '5xl': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.035em' }], // 48px / 55px
      },

      // 4. Civic Spacing Scale (Structural Rhythm)
      spacing: {
        '0.5': '0.125rem', // 2px  - Hairline borders, flag stripe accents
        '1': '0.25rem',    // 4px  - Micro element gaps, pillar borders
        '1.5': '0.375rem', // 6px  - Compact tag paddings
        '2': '0.5rem',     // 8px  - Badge padding, list gaps
        '3': '0.75rem',    // 12px - Form field vertical padding
        '4': '1rem',       // 16px - Standard component inner rhythm
        '5': '1.25rem',    // 20px - Medium button padding, alert gaps
        '6': '1.5rem',     // 24px - Card padding, grid gutters
        '8': '2rem',       // 32px - Card separation, subsection margins
        '10': '2.5rem',    // 40px - Standard content block separation
        '12': '3rem',      // 48px - Major section dividers
        '16': '4rem',      // 64px - Standard page section vertical padding
        '20': '5rem',      // 80px - Hero and header focal spacing
        '24': '6rem',      // 96px - Deep landing page vertical breathing room
      },

      // 5. Deliberate, Non-Uniform Border Radii (Avoiding uniform SaaS pill cards)
      borderRadius: {
        sharp: '0px',      // Strict institutional elements, tables, raw dividers
        doc: '2px',        // Formal certificates, legal disclaimers, data tables
        card: '4px',       // Structural cards, input fields, framed containers
        btn: '6px',        // Interactive buttons, actionable clickables
        pill: '9999px',    // Status badges, position tags, category pills
      },
    },
  },
  plugins: [],
};

export default config;
