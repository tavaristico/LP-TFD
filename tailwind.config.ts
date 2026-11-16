import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg:          '#000000',
          surface:     '#0A0A0A',
          border:      '#1A1A1A',
          footer:      '#111111',
          text:        '#E8E8E8',
          muted:       'var(--mf-color-graphite-lt)',
          headline:    'var(--mf-color-blood-ui)',
          subheadline: 'var(--mf-color-blood-dim)',
          accent:      'var(--mf-color-yellow)',
          cta:         'var(--mf-color-blood)',
          'cta-hover': 'var(--mf-color-blood-deep)',
          error:       'var(--mf-color-alarm)',
          // tokens do design system (mesmos nomes e valores do tailwind.extend.json)
          blood:         'var(--mf-color-blood)',
          'blood-deep':  'var(--mf-color-blood-deep)',
          'blood-wine':  'var(--mf-color-blood-wine)',
          'blood-ui':    'var(--mf-color-blood-ui)',
          'blood-lt':    'var(--mf-color-blood-lt)',
          gold:          'var(--mf-color-gold)',
          'mauve-lt':    'var(--mf-color-mauve-lt)',
          'graphite-lt': 'var(--mf-color-graphite-lt)',
          selection:     'var(--mf-color-selection)',
        },
      },
      borderRadius: {
        '8':  'var(--mf-radius-raw-8)',
        '12': 'var(--mf-radius-raw-12)',
        '16': 'var(--mf-radius-raw-16)',
      },
      fontFamily: {
        brand: ['var(--font-brother)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
