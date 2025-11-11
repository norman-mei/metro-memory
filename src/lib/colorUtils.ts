const normalizeHex = (value: string) => {
  const hex = value.trim().replace('#', '')
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return hex
      .split('')
      .map((char) => char + char)
      .join('')
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return hex
  }

  return null
}

const hexToRgb = (value?: string): [number, number, number] | null => {
  if (!value) {
    return null
  }

  const hex = normalizeHex(value)
  if (!hex) {
    return null
  }

  const int = parseInt(hex, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

const srgbChannel = (value: number) => {
  const normalized = value / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

export const getRelativeLuminance = (value?: string) => {
  const rgb = hexToRgb(value)
  if (!rgb) {
    return null
  }

  const [r, g, b] = rgb.map(srgbChannel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const isColorLight = (value?: string, threshold = 0.82) => {
  const luminance = getRelativeLuminance(value)
  if (luminance === null) {
    return false
  }

  return luminance >= threshold
}

export const pickVisibleColor = (
  primary?: string,
  fallback?: string,
  threshold = 0.82,
  defaultColor = '#4f46e5',
) => {
  if (primary && !isColorLight(primary, threshold)) {
    return primary
  }

  if (fallback && !isColorLight(fallback, threshold)) {
    return fallback
  }

  return primary ?? fallback ?? defaultColor
}
