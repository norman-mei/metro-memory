import { normalizeString } from '@/hooks/useNormalizeString'

export function extractJapanese(str: string) {
  str = normalizeString('tokyo')(str)
  // Regular expression to match Japanese characters
  const japaneseRegex = /[一-龯〈〉]/
  const latinRegex = /[a-zA-Z]/

  // Find the index of the first Japanese character
  const firstJapaneseIndex = str.search(japaneseRegex)

  // find the first latin character
  const firstLatinIndex = str.search(latinRegex)

  // Calculate the index of the last Japanese character in the original string
  const lastJapaneseIndex = firstLatinIndex - 1

  // Extract and return the substrings - Japanese and non-Japanese
  return [
    str.substring(firstJapaneseIndex, lastJapaneseIndex + 1),
    str.substring(lastJapaneseIndex + 1, str.length),
  ]
}
