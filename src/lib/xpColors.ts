function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function getXpRewardColor(xp: number) {
  const normalized = clamp((xp - 80) / 160, 0, 1)
  const hue = 140 - normalized * 135
  return `hsl(${hue} 78% 56%)`
}
