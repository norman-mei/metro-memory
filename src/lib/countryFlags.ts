const COUNTRY_SLUG_TO_ISO_CODE: Record<string, string> = {
  argentina: 'AR',
  australia: 'AU',
  austria: 'AT',
  belgium: 'BE',
  brazil: 'BR',
  bulgaria: 'BG',
  canada: 'CA',
  chile: 'CL',
  china: 'CN',
  colombia: 'CO',
  czechia: 'CZ',
  denmark: 'DK',
  egypt: 'EG',
  england: 'GB',
  finland: 'FI',
  france: 'FR',
  germany: 'DE',
  greece: 'GR',
  'hong-kong': 'CN',
  hungary: 'HU',
  india: 'IN',
  indonesia: 'ID',
  ireland: 'IE',
  israel: 'IL',
  italy: 'IT',
  japan: 'JP',
  malaysia: 'MY',
  mexico: 'MX',
  netherlands: 'NL',
  'new-zealand': 'NZ',
  norway: 'NO',
  peru: 'PE',
  philippines: 'PH',
  poland: 'PL',
  portugal: 'PT',
  romania: 'RO',
  scotland: 'GB',
  singapore: 'SG',
  'south-africa': 'ZA',
  'south-korea': 'KR',
  spain: 'ES',
  sweden: 'SE',
  switzerland: 'CH',
  taiwan: 'TW',
  thailand: 'TH',
  turkey: 'TR',
  uk: 'GB',
  usa: 'US',
  vietnam: 'VN',
  wales: 'GB',
}

export function getFlagEmojiFromCountryCode(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
}

export function getCityFlagEmojiFromPath(path: string) {
  const pathSegments = path.split('/').filter(Boolean)
  const countrySlug = pathSegments[1]
  const countryCode = countrySlug ? COUNTRY_SLUG_TO_ISO_CODE[countrySlug] : null
  return countryCode ? getFlagEmojiFromCountryCode(countryCode) : '\u{1F310}'
}
