export type AccentColorPalette = {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
}

export type AccentColorOption = {
  id: string
  label: string
  palette: AccentColorPalette
  ring: string
}

const accentColorOptions = [
  {
    id: 'indigo',
    label: 'Indigo',
    palette: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
    },
    ring: 'rgba(99, 102, 241, 0.45)',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    palette: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
    },
    ring: 'rgba(16, 185, 129, 0.35)',
  },
  {
    id: 'amber',
    label: 'Amber',
    palette: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    ring: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'rose',
    label: 'Rose',
    palette: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
    },
    ring: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'sky',
    label: 'Sky',
    palette: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
    },
    ring: 'rgba(14, 165, 233, 0.4)',
  },
] as const satisfies ReadonlyArray<AccentColorOption>

export type AccentColorId = (typeof accentColorOptions)[number]['id']

export const ACCENT_COLOR_OPTIONS = accentColorOptions

export const ACCENT_COLOR_MAP: Record<AccentColorId, AccentColorOption> =
  accentColorOptions.reduce(
    (acc, option) => {
      acc[option.id as AccentColorId] = option
      return acc
    },
    {} as Record<AccentColorId, AccentColorOption>,
  )

export const DEFAULT_ACCENT_COLOR_ID: AccentColorId = accentColorOptions[0].id
