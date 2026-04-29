'use client'

import {
    DEFAULT_ACCENT_COLOR_ID,
    normalizeAccentColorValue,
    resolveAccentColorOption,
    type AccentColorValue,
    isPresetAccentColor,
} from '@/lib/accentColors'
import { isSupportedLanguageCode, normalizeLanguageCode } from '@/lib/i18n'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return '0, 0, 0'
  }
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

const CUSTOM_FONT_SIZE_PREFIX = 'custom:'
export const CUSTOM_FONT_FAMILY_ID = 'customLocal'
const CUSTOM_FONT_STYLE_ID = 'metro-memory-custom-font-style'
const CUSTOM_FONT_FACE_NAME = 'Metro Memory Custom'
const CUSTOM_FONT_DB_NAME = 'metro-memory-assets'
const CUSTOM_FONT_STORE_NAME = 'custom-fonts'
const CUSTOM_FONT_RECORD_ID = 'custom-font'

export type FontSizeId = 'sm' | 'md' | 'lg' | 'xl'
export type FontSizeValue = FontSizeId | `${typeof CUSTOM_FONT_SIZE_PREFIX}${number}`
export type FontFamilyId =
  | 'system'
  | 'humanist'
  | 'geometric'
  | 'rounded'
  | 'slab'
  | 'condensed'
  | 'serif'
  | 'mono'
  | 'helveticaBold'
  | typeof CUSTOM_FONT_FAMILY_ID
export type StationMatchingMode = 'normal' | 'forgiving' | 'strict'

export type CustomFontData = {
  name: string
  dataUrl: string
  mimeType: string
  sizeBytes: number
}

export type CustomFontSaveResult =
  | { ok: true }
  | { ok: false; reason: 'quota_exceeded' | 'storage_unavailable' }

const openCustomFontDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('indexeddb_unavailable'))
      return
    }
    const request = window.indexedDB.open(CUSTOM_FONT_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CUSTOM_FONT_STORE_NAME)) {
        db.createObjectStore(CUSTOM_FONT_STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('indexeddb_open_failed'))
  })

const readCustomFontFromDb = async (): Promise<CustomFontData | null> => {
  const db = await openCustomFontDb()
  return new Promise<CustomFontData | null>((resolve, reject) => {
    const tx = db.transaction(CUSTOM_FONT_STORE_NAME, 'readonly')
    const store = tx.objectStore(CUSTOM_FONT_STORE_NAME)
    const request = store.get(CUSTOM_FONT_RECORD_ID)
    request.onsuccess = () => {
      const result = request.result
      if (
        result &&
        typeof result.name === 'string' &&
        typeof result.dataUrl === 'string' &&
        typeof result.mimeType === 'string' &&
        typeof result.sizeBytes === 'number'
      ) {
        resolve(result as CustomFontData)
        return
      }
      resolve(null)
    }
    request.onerror = () => reject(request.error ?? new Error('indexeddb_read_failed'))
    tx.oncomplete = () => db.close()
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb_tx_failed'))
  })
}

const writeCustomFontToDb = async (font: CustomFontData) => {
  const db = await openCustomFontDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CUSTOM_FONT_STORE_NAME, 'readwrite')
    tx.objectStore(CUSTOM_FONT_STORE_NAME).put(font, CUSTOM_FONT_RECORD_ID)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb_write_failed'))
  })
}

const deleteCustomFontFromDb = async () => {
  const db = await openCustomFontDb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CUSTOM_FONT_STORE_NAME, 'readwrite')
    tx.objectStore(CUSTOM_FONT_STORE_NAME).delete(CUSTOM_FONT_RECORD_ID)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error ?? new Error('indexeddb_delete_failed'))
  })
}

export const FONT_SIZE_OPTIONS: Array<{ id: FontSizeId; label: string; value: string }> = [
  { id: 'sm', label: 'Small', value: '14px' },
  { id: 'md', label: 'Medium', value: '16px' },
  { id: 'lg', label: 'Large', value: '18px' },
  { id: 'xl', label: 'Extra Large', value: '20px' },
]

export const FONT_FAMILY_OPTIONS: Array<{ id: FontFamilyId; label: string; stack: string }> = [
  {
    id: 'system',
    label: 'System',
    stack:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
  {
    id: 'humanist',
    label: 'Humanist',
    stack: '"Trebuchet MS", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: 'geometric',
    label: 'Geometric',
    stack: '"Futura", "Century Gothic", "Avant Garde", "Trebuchet MS", Arial, sans-serif',
  },
  {
    id: 'rounded',
    label: 'Rounded',
    stack: '"Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif',
  },
  {
    id: 'slab',
    label: 'Slab',
    stack: '"Rockwell", "Roboto Slab", "Times New Roman", serif',
  },
  {
    id: 'condensed',
    label: 'Condensed',
    stack: '"Arial Narrow", "Helvetica Neue Condensed", "Roboto Condensed", Arial, sans-serif',
  },
  {
    id: 'serif',
    label: 'Serif',
    stack: 'Georgia, "Times New Roman", serif',
  },
  {
    id: 'mono',
    label: 'Monospace',
    stack: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  {
    id: 'helveticaBold',
    label: 'Helvetica Bold',
    stack: '"Helvetica Bold UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
]

const CUSTOM_FONT_FAMILY_STACK = `"${CUSTOM_FONT_FACE_NAME}", ${FONT_FAMILY_OPTIONS[0].stack}`

const FONT_SIZE_MAP = FONT_SIZE_OPTIONS.reduce<Record<FontSizeId, string>>((acc, option) => {
  acc[option.id] = option.value
  return acc
}, {} as Record<FontSizeId, string>)

const clampCustomFontSizePx = (value: number) => Math.min(Math.max(Math.round(value), 10), 40)

export const isPresetFontSize = (value: string | null | undefined): value is FontSizeId =>
  !!value && value in FONT_SIZE_MAP

export const getCustomFontSizeValue = (value: string | number | null | undefined): FontSizeValue | null => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null
    }
    return `${CUSTOM_FONT_SIZE_PREFIX}${clampCustomFontSizePx(value)}` as FontSizeValue
  }
  if (!value) {
    return null
  }
  const parsed = Number.parseFloat(String(value).trim().replace(/px$/i, ''))
  if (!Number.isFinite(parsed)) {
    return null
  }
  return `${CUSTOM_FONT_SIZE_PREFIX}${clampCustomFontSizePx(parsed)}` as FontSizeValue
}

export const normalizeFontSizeValue = (value: string | null | undefined): FontSizeValue | null => {
  if (!value) {
    return null
  }
  if (isPresetFontSize(value)) {
    return value
  }
  if (value.startsWith(CUSTOM_FONT_SIZE_PREFIX)) {
    return getCustomFontSizeValue(value.slice(CUSTOM_FONT_SIZE_PREFIX.length))
  }
  return getCustomFontSizeValue(value)
}

export const resolveFontSizeCssValue = (value: FontSizeValue) => {
  if (isPresetFontSize(value)) {
    return FONT_SIZE_MAP[value]
  }
  const customValue = value.startsWith(CUSTOM_FONT_SIZE_PREFIX)
    ? Number.parseFloat(value.slice(CUSTOM_FONT_SIZE_PREFIX.length))
    : Number.NaN
  if (Number.isFinite(customValue)) {
    return `${clampCustomFontSizePx(customValue)}px`
  }
  return FONT_SIZE_MAP.md
}

export const getFontSizeNumericValue = (value: FontSizeValue) => {
  if (isPresetFontSize(value)) {
    return Number.parseFloat(FONT_SIZE_MAP[value])
  }
  const customValue = value.startsWith(CUSTOM_FONT_SIZE_PREFIX)
    ? Number.parseFloat(value.slice(CUSTOM_FONT_SIZE_PREFIX.length))
    : Number.NaN
  return Number.isFinite(customValue) ? clampCustomFontSizePx(customValue) : Number.parseFloat(FONT_SIZE_MAP.md)
}

const FONT_FAMILY_MAP = FONT_FAMILY_OPTIONS.reduce<Record<FontFamilyId, string>>((acc, option) => {
  acc[option.id] = option.stack
  return acc
}, {} as Record<FontFamilyId, string>)

const isValidFontFamily = (value: string | null | undefined): value is FontFamilyId =>
  !!value && (value === CUSTOM_FONT_FAMILY_ID || value in FONT_FAMILY_MAP)

const isValidStationMatchingMode = (
  value: string | null | undefined,
): value is StationMatchingMode =>
  value === 'normal' || value === 'forgiving' || value === 'strict'

type Settings = {
  confettiEnabled: boolean
  achievementToastsEnabled: boolean
  achievementToastDurationSec: number
  stopConfettiAfterCompletion: boolean
  autoSubmitOnMatch: boolean
  stationMatchingMode: StationMatchingMode
  accentColor: AccentColorValue
  fontSize: FontSizeValue
  fontFamily: FontFamilyId
  language: string
  timezone: string
  hourFormat: '12h' | '24h'
  keybindings: Record<KeybindingAction, string>
}

export type KeybindingAction =
  | 'FOCUS_INPUT'
  | 'CLEAR_INPUT'
  | 'TOGGLE_ZEN_MODE'
  | 'TOGGLE_SIDEBAR'
  | 'TOGGLE_SOLUTIONS'
  | 'TOGGLE_SPEEDRUN'
  | 'OPEN_ACHIEVEMENTS'
  | 'OPEN_ACCOUNT'
  | 'OPEN_SETTINGS'
  | 'OPEN_CITY_STATS'
  | 'TOGGLE_LABELS'
  | 'TOGGLE_MAP_NAMES'
  | 'TOGGLE_SATELLITE'

export const DEFAULT_KEYBINDINGS: Record<KeybindingAction, string> = {
  FOCUS_INPUT: '/',
  CLEAR_INPUT: 'Escape',
  TOGGLE_ZEN_MODE: 'Alt+z',
  TOGGLE_SIDEBAR: 'Alt+b',
  TOGGLE_SOLUTIONS: 'Alt+s',
  TOGGLE_SPEEDRUN: 'Alt+r',
  OPEN_ACHIEVEMENTS: 'Alt+a',
  OPEN_ACCOUNT: 'Alt+c',
  OPEN_SETTINGS: 'Alt+,',
  OPEN_CITY_STATS: 'Alt+i',
  TOGGLE_LABELS: 'Alt+l',
  TOGGLE_MAP_NAMES: 'Alt+n',
  TOGGLE_SATELLITE: 'Alt+.',
}

type UpdateSettingsOptions = { silent?: boolean }

const DEFAULT_SETTINGS: Settings = {
  confettiEnabled: true,
  achievementToastsEnabled: true,
  achievementToastDurationSec: 15,
  stopConfettiAfterCompletion: false,
  autoSubmitOnMatch: false,
  stationMatchingMode: 'normal',
  accentColor: DEFAULT_ACCENT_COLOR_ID,
  fontSize: 'md',
  fontFamily: 'system',
  language: 'en',
  timezone: 'UTC',
  hourFormat: '24h',
  keybindings: DEFAULT_KEYBINDINGS,
}

const STORAGE_KEY = 'metro-memory-settings'

type SettingsContextValue = {
  settings: Settings
  customFont: CustomFontData | null
  setConfettiEnabled: (enabled: boolean) => void
  setAchievementToastsEnabled: (enabled: boolean) => void
  setAchievementToastDurationSec: (seconds: number) => void
  setStopConfettiAfterCompletion: (enabled: boolean) => void
  setAutoSubmitOnMatch: (enabled: boolean) => void
  setStationMatchingMode: (mode: StationMatchingMode) => void
  setAccentColor: (accent: AccentColorValue) => void
  setFontSize: (size: FontSizeValue) => void
  setFontFamily: (family: FontFamilyId) => void
  setCustomFont: (font: CustomFontData | null) => Promise<CustomFontSaveResult>
  setLanguage: (language: string, options?: UpdateSettingsOptions) => void
  setTimezone: (timezone: string, options?: UpdateSettingsOptions) => void
  setHourFormat: (format: '12h' | '24h', options?: UpdateSettingsOptions) => void
  setKeybinding: (action: KeybindingAction, key: string) => void
  notifySettingsSaved: () => void
  lastSavedAt: number
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [customFont, setCustomFontState] = useState<CustomFontData | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null) {
        if (
          typeof parsed.confettiEnabled === 'boolean' &&
          typeof parsed.achievementToastsEnabled === 'boolean'
        ) {
          setSettings({
            confettiEnabled: parsed.confettiEnabled,
            achievementToastsEnabled: parsed.achievementToastsEnabled,
            achievementToastDurationSec:
              typeof parsed.achievementToastDurationSec === 'number' &&
              Number.isFinite(parsed.achievementToastDurationSec)
                ? Math.min(Math.max(parsed.achievementToastDurationSec, 3), 120)
                : DEFAULT_SETTINGS.achievementToastDurationSec,
            stopConfettiAfterCompletion:
              typeof parsed.stopConfettiAfterCompletion === 'boolean'
                ? parsed.stopConfettiAfterCompletion
                : DEFAULT_SETTINGS.stopConfettiAfterCompletion,
            autoSubmitOnMatch:
              typeof parsed.autoSubmitOnMatch === 'boolean'
                ? parsed.autoSubmitOnMatch
                : DEFAULT_SETTINGS.autoSubmitOnMatch,
            stationMatchingMode:
              typeof parsed.stationMatchingMode === 'string' &&
              isValidStationMatchingMode(parsed.stationMatchingMode)
                ? parsed.stationMatchingMode
                : DEFAULT_SETTINGS.stationMatchingMode,
            accentColor:
              typeof parsed.accentColor === 'string'
                ? normalizeAccentColorValue(parsed.accentColor) ?? DEFAULT_SETTINGS.accentColor
                : DEFAULT_SETTINGS.accentColor,
            fontSize:
              typeof parsed.fontSize === 'string'
                ? normalizeFontSizeValue(parsed.fontSize) ?? DEFAULT_SETTINGS.fontSize
                : DEFAULT_SETTINGS.fontSize,
            fontFamily:
              typeof parsed.fontFamily === 'string' && isValidFontFamily(parsed.fontFamily)
                ? parsed.fontFamily
                : DEFAULT_SETTINGS.fontFamily,
            language:
              isSupportedLanguageCode(parsed.language)
                ? normalizeLanguageCode(parsed.language) ?? DEFAULT_SETTINGS.language
                : DEFAULT_SETTINGS.language,
            timezone:
              typeof parsed.timezone === 'string'
                ? parsed.timezone
                : DEFAULT_SETTINGS.timezone,
            hourFormat:
              parsed.hourFormat === '12h' || parsed.hourFormat === '24h'
                ? parsed.hourFormat
                : DEFAULT_SETTINGS.hourFormat,
            keybindings:
              typeof parsed.keybindings === 'object' && parsed.keybindings !== null
                ? { ...DEFAULT_SETTINGS.keybindings, ...parsed.keybindings }
                : DEFAULT_SETTINGS.keybindings,
          })
        }
      }
    } catch {
      // ignore malformed entries
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    readCustomFontFromDb()
      .then((font) => {
        if (!cancelled) {
          setCustomFontState(font)
        }
      })
      .catch(() => {
        // ignore indexeddb load failures
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const accent = resolveAccentColorOption(settings.accentColor)
    const root = document.documentElement
    ;(
      Object.entries(accent.palette) as unknown as Array<
        [keyof typeof accent.palette, string]
      >
    ).forEach(([stop, value]) => {
      root.style.setProperty(`--accent-${stop}`, value)
      root.style.setProperty(`--accent-${stop}-rgb`, hexToRgb(value))
    })
    root.style.setProperty('--accent-ring', accent.ring)
    root.dataset.accent = accent.id
  }, [settings.accentColor])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const fontSize = resolveFontSizeCssValue(settings.fontSize)
    const fontFamily =
      settings.fontFamily === CUSTOM_FONT_FAMILY_ID && customFont
        ? CUSTOM_FONT_FAMILY_STACK
        : FONT_FAMILY_MAP[settings.fontFamily] ?? FONT_FAMILY_MAP.system
    root.style.setProperty('--ui-font-size', fontSize)
    root.style.setProperty('--ui-font', fontFamily)
  }, [customFont, settings.fontFamily, settings.fontSize])

  useEffect(() => {
    if (typeof document === 'undefined') return
    let styleElement = document.getElementById(CUSTOM_FONT_STYLE_ID) as HTMLStyleElement | null
    if (!customFont) {
      if (styleElement) {
        styleElement.remove()
      }
      return
    }
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = CUSTOM_FONT_STYLE_ID
      document.head.appendChild(styleElement)
    }
    styleElement.textContent = `@font-face { font-family: "${CUSTOM_FONT_FACE_NAME}"; src: url("${customFont.dataUrl}"); font-display: swap; }`
  }, [customFont])

  const notifySettingsSaved = useCallback(() => {
    setLastSavedAt(Date.now())
  }, [])

  const persist = useCallback((next: Settings) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }, [])

  const setCustomFont = useCallback(
    async (font: CustomFontData | null): Promise<CustomFontSaveResult> => {
      try {
        if (!font) {
          await deleteCustomFontFromDb()
          setCustomFontState(null)
          if (settings.fontFamily === CUSTOM_FONT_FAMILY_ID) {
            setSettings((prev) => {
              const next: Settings = { ...prev, fontFamily: DEFAULT_SETTINGS.fontFamily }
              persist(next)
              notifySettingsSaved()
              return next
            })
          }
          return { ok: true }
        }
        await writeCustomFontToDb(font)
        setCustomFontState(font)
        setSettings((prev) => {
          const next: Settings = { ...prev, fontFamily: CUSTOM_FONT_FAMILY_ID }
          persist(next)
          notifySettingsSaved()
          return next
        })
        return { ok: true }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          return { ok: false, reason: 'quota_exceeded' }
        }
        return { ok: false, reason: 'storage_unavailable' }
      }
    },
    [notifySettingsSaved, persist, settings.fontFamily],
  )

  const updateSettings = useCallback(
    (partial: Partial<Settings>, options?: UpdateSettingsOptions) => {
      setSettings((prev) => {
        const entries = Object.entries(partial) as [keyof Settings, Settings[keyof Settings]][]
        const shouldUpdate = entries.some(
          ([key, value]) => value !== undefined && prev[key] !== value,
        )
        if (!shouldUpdate) {
          return prev
        }
        const next = { ...prev, ...partial }
        persist(next)
        if (!options?.silent) {
          notifySettingsSaved()
        }
        return next
      })
    },
    [persist, notifySettingsSaved],
  )

  const value = useMemo(
    () => ({
      settings,
      customFont,
      setConfettiEnabled: (enabled: boolean) => updateSettings({ confettiEnabled: enabled }),
      setAchievementToastsEnabled: (enabled: boolean) =>
        updateSettings({ achievementToastsEnabled: enabled }),
      setAchievementToastDurationSec: (seconds: number) =>
        updateSettings({
          achievementToastDurationSec: Math.min(Math.max(seconds, 3), 120),
        }),
      setStopConfettiAfterCompletion: (enabled: boolean) =>
        updateSettings({ stopConfettiAfterCompletion: enabled }),
      setAutoSubmitOnMatch: (enabled: boolean) =>
        updateSettings({ autoSubmitOnMatch: enabled }),
      setStationMatchingMode: (mode: StationMatchingMode) => {
        if (isValidStationMatchingMode(mode)) {
          updateSettings({ stationMatchingMode: mode })
        }
      },
      setAccentColor: (accent: AccentColorValue) => {
        const normalizedAccent = isPresetAccentColor(accent)
          ? accent
          : normalizeAccentColorValue(accent)
        if (normalizedAccent) {
          updateSettings({ accentColor: normalizedAccent })
        }
      },
      setFontSize: (size: FontSizeValue) => {
        const normalizedSize = isPresetFontSize(size) ? size : normalizeFontSizeValue(size)
        if (normalizedSize) {
          updateSettings({ fontSize: normalizedSize })
        }
      },
      setFontFamily: (family: FontFamilyId) => {
        if (family === CUSTOM_FONT_FAMILY_ID) {
          if (customFont) {
            updateSettings({ fontFamily: family })
          }
          return
        }
        if (family in FONT_FAMILY_MAP) {
          updateSettings({ fontFamily: family })
        }
      },
      setCustomFont,
      setLanguage: (language: string, options?: UpdateSettingsOptions) => {
        const normalizedLanguage = normalizeLanguageCode(language)
        if (normalizedLanguage && isSupportedLanguageCode(normalizedLanguage)) {
          updateSettings({ language: normalizedLanguage }, options)
        }
      },
      setTimezone: (timezone: string, options?: UpdateSettingsOptions) =>
        updateSettings({ timezone }, options),
      setHourFormat: (format: '12h' | '24h', options?: UpdateSettingsOptions) =>
        updateSettings({ hourFormat: format }, options),
      setKeybinding: (action: KeybindingAction, key: string) =>
        updateSettings({
          keybindings: { ...settings.keybindings, [action]: key },
        }),
      notifySettingsSaved,
      lastSavedAt,
    }),
    [customFont, settings, setCustomFont, updateSettings, notifySettingsSaved, lastSavedAt],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return ctx
}
