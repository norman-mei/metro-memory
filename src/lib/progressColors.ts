const clampPercent = (percent: number) => Math.max(0, Math.min(1, percent))

type ColorStop = [number, number, number]

const defaultStart: ColorStop = [220, 38, 38] // red-600
const defaultEnd: ColorStop = [34, 197, 94] // emerald-400

const lerp = (start: number, end: number, t: number) => start + (end - start) * t

export const getCompletionColor = (
  percent: number,
  options?: { start?: ColorStop; end?: ColorStop },
) => {
  const t = clampPercent(percent)
  const [sr, sg, sb] = options?.start ?? defaultStart
  const [er, eg, eb] = options?.end ?? defaultEnd
  const r = Math.round(lerp(sr, er, t))
  const g = Math.round(lerp(sg, eg, t))
  const b = Math.round(lerp(sb, eb, t))
  return `rgb(${r}, ${g}, ${b})`
}

export default getCompletionColor
