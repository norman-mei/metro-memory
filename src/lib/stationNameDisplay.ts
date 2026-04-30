const OpenCC = require('opencc-js')

const toSimplifiedTraditionalConverter = OpenCC.Converter({
  from: 't',
  to: 'cn',
})
const toSimplifiedTaiwanConverter = OpenCC.Converter({
  from: 'tw',
  to: 'cn',
})
const toSimplifiedHongKongConverter = OpenCC.Converter({
  from: 'hk',
  to: 'cn',
})

const CJK_PARENTHESES_RE = /([（(])([^()（）]*[\u3400-\u9FFF][^()（）]*)([)）])/g

const convertTraditionalChineseToSimplified = (value: string) =>
  toSimplifiedTraditionalConverter(
    toSimplifiedHongKongConverter(toSimplifiedTaiwanConverter(value)),
  )

export const formatLocalizedStationDisplayName = (
  value: string | undefined | null,
  language?: string | null,
) => {
  if (!value) {
    return ''
  }

  if (language !== 'zh-CN') {
    return value
  }

  return value.replace(CJK_PARENTHESES_RE, (_match, open, inner, close) => {
    return `${open}${convertTraditionalChineseToSimplified(inner)}${close}`
  })
}
