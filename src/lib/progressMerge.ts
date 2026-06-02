export type ProgressPayload = {
  foundIds: number[]
  foundTimestamps?: Record<string, string> | null
}

export const normalizeProgressIds = (value: unknown): number[] =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : []).filter(
        (id): id is number => typeof id === 'number' && Number.isFinite(id),
      ),
    ),
  )

export const normalizeProgressTimestamps = (
  value: unknown,
): Record<string, string> => {
  if (!value || typeof value !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

export const mergeProgressPayloads = (
  current: ProgressPayload | null | undefined,
  incoming: ProgressPayload | null | undefined,
): ProgressPayload => {
  const foundIds = Array.from(
    new Set([
      ...normalizeProgressIds(current?.foundIds),
      ...normalizeProgressIds(incoming?.foundIds),
    ]),
  )
  const currentTimestamps = normalizeProgressTimestamps(current?.foundTimestamps)
  const incomingTimestamps = normalizeProgressTimestamps(incoming?.foundTimestamps)
  const foundSet = new Set(foundIds)
  const foundTimestamps: Record<string, string> = {}

  for (const [id, timestamp] of Object.entries({
    ...currentTimestamps,
    ...incomingTimestamps,
  })) {
    if (!foundSet.has(Number(id))) {
      continue
    }
    const existing = foundTimestamps[id]
    const currentValue = currentTimestamps[id]
    const incomingValue = incomingTimestamps[id]
    const earliest =
      currentValue && incomingValue
        ? currentValue < incomingValue
          ? currentValue
          : incomingValue
        : currentValue || incomingValue || timestamp
    if (!existing || earliest < existing) {
      foundTimestamps[id] = earliest
    }
  }

  return { foundIds, foundTimestamps }
}
