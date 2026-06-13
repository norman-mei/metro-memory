import test from 'node:test'
import assert from 'node:assert/strict'

import { generateChineseDirectionalAlternates } from '../../src/lib/chineseDirectionalAliases.ts'
import {
  generateChineseStreetAlternates,
  generateContextualChineseStreetAlternates,
} from '../../src/lib/chineseStreetAliases.ts'
import { normalizeChineseStationDisplayName } from '../../src/lib/chineseStationNameNormalization.ts'
import { normalizeString } from '../../src/lib/normalizeStationString.ts'
import { shouldAutoSubmitStationInput } from '../../src/lib/stationMatching.ts'
import { generateStationlessAlternates } from '../../src/lib/stationlessAliases.ts'
import { generateUniversityStationAlternates } from '../../src/lib/universityStationAliases.ts'
import type { DataFeature } from '../../src/lib/types.ts'

const pointFeature = (
  id: number,
  name: string,
  alternateNames: string[] = [],
): DataFeature => ({
  type: 'Feature',
  id,
  geometry: {
    type: 'Point',
    coordinates: [0, 0],
  },
  properties: {
    name,
    line: 'test-line',
    alternate_names: alternateNames,
  },
})

test('Chinese directional aliases bridge English, pinyin, and Chinese directions', () => {
  const englishAlternates = generateChineseDirectionalAlternates(
    'Beijing North Railway Station',
  )
  assert.ok(englishAlternates.includes('Beijing bei Railway Station'))
  assert.ok(englishAlternates.includes('Beijing N Railway Station'))

  const pinyinAlternates = generateChineseDirectionalAlternates('bei jing bei zhan')
  assert.ok(pinyinAlternates.includes('bei jing North zhan'))
  assert.ok(pinyinAlternates.includes('bei jing N zhan'))

  const chineseAlternates = generateChineseDirectionalAlternates('\u5317\u4eac\u5317\u7ad9')
  assert.ok(chineseAlternates.includes('\u5317\u4eacbei\u7ad9'))
  assert.ok(chineseAlternates.includes('\u5317\u4eacNorth\u7ad9'))

  const innerOuterAlternates = generateChineseDirectionalAlternates(
    '\u5e7f\u5b89\u95e8\u5185',
  )
  assert.ok(innerOuterAlternates.includes('\u5e7f\u5b89\u95e8Inner'))
  assert.ok(innerOuterAlternates.includes('\u5e7f\u5b89\u95e8nei'))
})

test('Chinese directional aliases can resolve exact station input', () => {
  const normalizeBeijing = normalizeString('beijing')
  const sourceAlternates = [
    'Beijing North Railway Station',
    'bei jing bei zhan',
    '\u5317\u4eac\u5317\u7ad9',
  ]
  const alternates = [
    ...sourceAlternates,
    ...sourceAlternates.flatMap((value) =>
      generateChineseDirectionalAlternates(value),
    ),
  ]
  const feature = pointFeature(1, 'Beijing North Railway Station', alternates)

  ;[
    'Beijing bei Railway Station',
    'Beijing N Railway Station',
    'bei jing North zhan',
    'bei jing N zhan',
    '\u5317\u4eacbei\u7ad9',
  ].forEach((rawInput) => {
    assert.equal(
      shouldAutoSubmitStationInput({
        features: [feature],
        rawInput,
        normalizeValue: normalizeBeijing,
        stripOptionalPrefixes: (value) => value,
      }),
      true,
      rawInput,
    )
  })
})

test('Chinese station and railway words are optional in station aliases', () => {
  assert.deepEqual(generateStationlessAlternates('Beijing Railway Station'), [
    'Beijing',
  ])
  assert.deepEqual(generateStationlessAlternates('\u5317\u4eac\u5317\u7ad9'), [
    '\u5317\u4eac\u5317',
  ])
  assert.deepEqual(generateStationlessAlternates('\u5e7f\u5dde\u706b\u8f66\u7ad9'), [
    '\u5e7f\u5dde',
  ])
  assert.deepEqual(generateStationlessAlternates('\u5ee3\u5dde\u706b\u8eca\u7ad9'), [
    '\u5ee3\u5dde',
  ])
})

test('Chinese direction aliases also work without station suffixes', () => {
  const normalizeBeijing = normalizeString('beijing')
  const sourceAlternates = ['\u5317\u4eac\u5317\u7ad9']
  const directionalAlternates = sourceAlternates.flatMap((value) =>
    generateChineseDirectionalAlternates(value),
  )
  const alternates = [
    ...sourceAlternates,
    ...directionalAlternates,
    ...[...sourceAlternates, ...directionalAlternates].flatMap((value) =>
      generateStationlessAlternates(value),
    ),
  ]
  const feature = pointFeature(2, 'Beijing North Railway Station', alternates)

  ;['\u5317\u4eac\u5317', '\u5317\u4eacbei', '\u5317\u4eacNorth'].forEach(
    (rawInput) => {
      assert.equal(
        shouldAutoSubmitStationInput({
          features: [feature],
          rawInput,
          normalizeValue: normalizeBeijing,
          stripOptionalPrefixes: (value) => value,
        }),
        true,
        rawInput,
      )
    },
  )
})

test('university directional gate aliases can be guessed by institution name', () => {
  assert.deepEqual(
    generateUniversityStationAlternates('Sun Yat-sen University East Gate').sort(),
    ['Sun Yat-sen', 'Sun Yat-sen Uni', 'Sun Yat-sen Univ', 'Sun Yat-sen University'],
  )
  assert.deepEqual(
    generateUniversityStationAlternates('Sun Yat-sen University E Gate').sort(),
    ['Sun Yat-sen', 'Sun Yat-sen Uni', 'Sun Yat-sen Univ', 'Sun Yat-sen University'],
  )
  assert.deepEqual(
    generateUniversityStationAlternates('Peking Univ East Gate').sort(),
    ['Peking', 'Peking Univ', 'Peking University'],
  )
  assert.deepEqual(
    generateUniversityStationAlternates('zhong shan da xue dong men').sort(),
    ['zhong shan', 'zhong shan da xue'],
  )
  assert.deepEqual(
    generateUniversityStationAlternates('zhong shan daxue dong men').sort(),
    ['zhong shan', 'zhong shan daxue'],
  )
  assert.deepEqual(
    generateUniversityStationAlternates('\u4e2d\u5c71\u5927\u5b66\u4e1c\u95e8').sort(),
    ['\u4e2d\u5c71', '\u4e2d\u5c71\u5927\u5b66'],
  )
})

test('university aliases resolve exact station input without gate wording', () => {
  const normalizeGuangzhou = normalizeString('gba')
  const sourceAlternates = [
    'Sun Yat-sen University East Gate',
    'zhong shan da xue dong men',
    '\u4e2d\u5c71\u5927\u5b66\u4e1c\u95e8',
  ]
  const stationlessAlternates = sourceAlternates.flatMap((value) =>
    generateStationlessAlternates(value),
  )
  const universityAlternates = [
    ...sourceAlternates,
    ...stationlessAlternates,
  ].flatMap((value) => generateUniversityStationAlternates(value))
  const feature = pointFeature(3, 'Sun Yat-sen University East Gate', [
    ...sourceAlternates,
    ...stationlessAlternates,
    ...universityAlternates,
  ])

  ;[
    'Sun Yat-sen University',
    'Sun Yat-sen',
    'zhong shan da xue',
    'zhong shan',
    '\u4e2d\u5c71\u5927\u5b66',
    '\u4e2d\u5c71',
  ].forEach((rawInput) => {
    assert.equal(
      shouldAutoSubmitStationInput({
        features: [feature],
        rawInput,
        normalizeValue: normalizeGuangzhou,
        stripOptionalPrefixes: (value) => value,
      }),
      true,
      rawInput,
    )
  })
})

test('Chinese street infrastructure terms bridge English, pinyin, and Chinese names', () => {
  assert.ok(
    generateChineseStreetAlternates('Caihong Bridge').includes('Caihong qiao'),
  )
  assert.ok(
    generateChineseStreetAlternates('cai hong qiao').includes('cai hong bridge'),
  )
  assert.ok(
    generateChineseStreetAlternates('\u5f69\u8679\u6865').includes('\u5f69\u8679bridge'),
  )
  assert.ok(
    generateChineseStreetAlternates('Zhongshan Avenue').includes('Zhongshan da jie'),
  )
  assert.ok(
    generateChineseStreetAlternates('zhong shan dajie').includes(
      'zhong shan avenue',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('\u4e2d\u5c71\u5927\u8857').includes(
      '\u4e2d\u5c71avenue',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('Beijing Street').includes('Beijing jie'),
  )
  assert.ok(
    generateChineseStreetAlternates('\u5317\u4eac\u8857').includes(
      '\u5317\u4eacstreet',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('\u524d\u95e8').includes('\u524dgate'),
  )
  assert.ok(
    generateChineseStreetAlternates('qian men').includes('qian gate'),
  )
  assert.ok(
    generateChineseStreetAlternates('\u5165\u53e3').includes('\u5165entrance'),
  )
  assert.ok(
    generateChineseStreetAlternates('ru kou').includes('ru entrance'),
  )
  assert.ok(
    generateChineseStreetAlternates('Tianshui Road').includes('Tianshui lu'),
  )
  assert.ok(
    generateChineseStreetAlternates('Chaoyang Park').includes('Chaoyang gong yuan'),
  )
  assert.ok(
    generateChineseStreetAlternates('People Square').includes(
      'People guang chang',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('People Plaza').includes(
      'People guang chang',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('Wanda Mall').includes('Wanda shang chang'),
  )
  assert.ok(
    generateChineseStreetAlternates('City Library').includes('City tu shu guan'),
  )
  assert.ok(
    generateChineseStreetAlternates('Convention Exhibition Center').includes(
      'Convention hui zhan zhong xin',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('Convention Exhibition Centre').includes(
      'Convention hui zhan zhong xin',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('Convention huizhanzhongxin').includes(
      'Convention exhibition center',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('\u4f1a\u5c55\u4e2d\u5fc3').includes(
      'exhibition center',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('\u5c55\u89c8\u9986').includes(
      'exhibition hall',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('Nanluoguxiang Hutong').includes(
      'Nanluoguxiang hu tong',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('\u5357\u9523\u9f13\u5df7\u80e1\u540c').includes(
      '\u5357\u9523\u9f13\u5df7alley',
    ),
  )
  assert.ok(
    generateChineseStreetAlternates('Shahe Village').includes('Shahe cun'),
  )
  assert.ok(
    generateChineseStreetAlternates('Hujialou Tower').includes('Hujialou lou'),
  )
  assert.ok(
    generateChineseStreetAlternates('Yonghegong Temple').includes('Yonghegong si'),
  )
  assert.ok(
    generateChineseStreetAlternates('West Lake').includes('West hu'),
  )
  assert.ok(
    generateChineseStreetAlternates('Liangma River').includes('Liangma he'),
  )
  assert.ok(
    generateChineseStreetAlternates('Xiangshan Mountain').includes('Xiangshan shan'),
  )
  assert.ok(
    generateChineseStreetAlternates('Qianhai Bay').includes('Qianhai wan'),
  )
})

test('Chinese street aliases resolve exact station input', () => {
  const normalizeBeijing = normalizeString('beijing')
  const sourceAlternates = [
    'Caihong Bridge',
    'cai hong qiao',
    '\u5f69\u8679\u6865',
    'Zhongshan Avenue',
    'zhong shan da jie',
    '\u4e2d\u5c71\u5927\u8857',
    'Tianshui Road',
    'Chaoyang Park',
    'People Square',
    'Wanda Mall',
    'City Library',
    'Convention Exhibition Center',
    'Convention Exhibition Centre',
    'Convention huizhanzhongxin',
    '\u4f1a\u5c55\u4e2d\u5fc3',
    '\u5c55\u89c8\u9986',
    'Nanluoguxiang Hutong',
    'Shahe Village',
    'Hujialou Tower',
    'Yonghegong Temple',
    'West Lake',
    'Liangma River',
    'Xiangshan Mountain',
    'Qianhai Bay',
  ]
  const streetAlternates = sourceAlternates.flatMap((value) =>
    generateChineseStreetAlternates(value),
  )
  const feature = pointFeature(4, 'Caihong Bridge', [
    ...sourceAlternates,
    ...streetAlternates,
  ])

  ;[
    'Caihong qiao',
    'cai hong bridge',
    '\u5f69\u8679bridge',
    'Zhongshan dajie',
    'zhong shan avenue',
    '\u4e2d\u5c71avenue',
    'Tianshui lu',
    'Chaoyang gong yuan',
    'People guang chang',
    'Wanda shang chang',
    'City tu shu guan',
    'Convention hui zhan zhong xin',
    'Convention exhibition center',
    'exhibition center',
    'exhibition hall',
    'Nanluoguxiang hu tong',
    'Shahe cun',
    'Hujialou lou',
    'Yonghegong si',
    'West hu',
    'Liangma he',
    'Xiangshan shan',
    'Qianhai wan',
  ].forEach((rawInput) => {
    assert.equal(
      shouldAutoSubmitStationInput({
        features: [feature],
        rawInput,
        normalizeValue: normalizeBeijing,
        stripOptionalPrefixes: (value) => value,
      }),
      true,
      rawInput,
    )
  })
})

test('Chinese station display names are Englishified only with matching Chinese suffix context', () => {
  assert.equal(
    normalizeChineseStationDisplayName('Jinghai Lu (\u7ecf\u6d77\u8def)'),
    'Jinghai Road (\u7ecf\u6d77\u8def)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Tongji Nanlu (\u540c\u6d4e\u5357\u8def)'),
    'Tongji South Road (\u540c\u6d4e\u5357\u8def)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Nandajie (\u5357\u5927\u8857)'),
    'South Avenue (\u5357\u5927\u8857)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Nanmen (\u5357\u95e8)'),
    'South Gate (\u5357\u95e8)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Bei Dajie (\u5317\u5927\u8857)'),
    'North Avenue (\u5317\u5927\u8857)',
  )
  assert.equal(
    normalizeChineseStationDisplayName("Da'nanmen (\u5927\u5357\u95e8)"),
    "Da'nan Gate (\u5927\u5357\u95e8)",
  )
  assert.equal(
    normalizeChineseStationDisplayName('Dabeimen (\u5927\u5317\u95e8)'),
    'Dabei Gate (\u5927\u5317\u95e8)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Tiexiguangchang (\u94c1\u897f\u5e7f\u573a)'),
    'Tiexi Square (\u94c1\u897f\u5e7f\u573a)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Lianhua Qiao (\u83b2\u82b1\u6865)'),
    'Lianhua Bridge (\u83b2\u82b1\u6865)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Dongdaqiao (\u4e1c\u5927\u6865)'),
    'Dongda Bridge (\u4e1c\u5927\u6865)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Huaxiang Dong Bridge (\u82b1\u4e61\u4e1c\u6865)'),
    'Huaxiang East Bridge (\u82b1\u4e61\u4e1c\u6865)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Huaxiangdongqiao (\u82b1\u4e61\u4e1c\u6865)'),
    'Huaxiang East Bridge (\u82b1\u4e61\u4e1c\u6865)',
  )
  assert.equal(
    normalizeChineseStationDisplayName(
      'Senlin Gongyuan Nan Gate (\u68ee\u6797\u516c\u56ed\u5357\u95e8)',
    ),
    'Senlin Park Gate South (\u68ee\u6797\u516c\u56ed\u5357\u95e8)',
  )
  assert.equal(
    normalizeChineseStationDisplayName(
      'Aolinpike Park (\u5965\u6797\u5339\u514b\u516c\u56ed)',
    ),
    'Olympic Park (\u5965\u6797\u5339\u514b\u516c\u56ed)',
  )
  assert.equal(
    normalizeChineseStationDisplayName(
      'Andeli Bei Street (\u5b89\u5fb7\u91cc\u5317\u8857)',
    ),
    'Andeli Street North (\u5b89\u5fb7\u91cc\u5317\u8857)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Andelibeijie (\u5b89\u5fb7\u91cc\u5317\u8857)'),
    'Andeli Street North (\u5b89\u5fb7\u91cc\u5317\u8857)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Dahongmennan (\u5927\u7ea2\u95e8\u5357)'),
    'Dahong Gate South (\u5927\u7ea2\u95e8\u5357)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Guangqumennei (\u5e7f\u6e20\u95e8\u5185)'),
    'Guangqu Gate Inner (\u5e7f\u6e20\u95e8\u5185)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Yongfengnan (\u6c38\u4e30\u5357)'),
    'Yongfeng South (\u6c38\u4e30\u5357)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Wanshengxi (\u4e07\u76db\u897f)'),
    'Wansheng West (\u4e07\u76db\u897f)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Dongguantounan (\u4e1c\u7ba1\u5934\u5357)'),
    'Dongguantou South (\u4e1c\u7ba1\u5934\u5357)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Qianhai Wan (\u524d\u6d77\u6e7e)'),
    'Qianhai Wan (\u524d\u6d77\u6e7e)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Qianhaiwan (\u524d\u6d77\u6e7e)'),
    'Qianhai Bay (\u524d\u6d77\u6e7e)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Pinganli (\u5e73\u5b89\u91cc)'),
    'Pingan Lane (\u5e73\u5b89\u91cc)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Ligong (\u91cc\u5171)'),
    'Ligong (\u91cc\u5171)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Lucheng (\u6f5e\u57ce)'),
    'Lu City (\u6f5e\u57ce)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Chengnan (\u57ce\u5357)'),
    'City South (\u57ce\u5357)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Gucheng (\u53e4\u57ce)'),
    'Ancient City (\u53e4\u57ce)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Beiguoshangcheng (\u5317\u56fd\u5546\u57ce)'),
    'Beiguo Mall (\u5317\u56fd\u5546\u57ce)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Chengdu (\u6210\u90fd)'),
    'Chengdu (\u6210\u90fd)',
  )
  assert.equal(
    normalizeChineseStationDisplayName(
      'Shanghai Hongqiao Huochezhan (\u4e0a\u6d77\u8679\u6865\u706b\u8f66\u7ad9)',
    ),
    'Shanghai Hongqiao Railway Station (\u4e0a\u6d77\u8679\u6865\u706b\u8f66\u7ad9)',
  )
  assert.equal(
    normalizeChineseStationDisplayName(
      'Shanghai Hongqiao Huoche Zhan (\u4e0a\u6d77\u8679\u6865\u706b\u8f66\u7ad9)',
    ),
    'Shanghai Hongqiao Railway Station (\u4e0a\u6d77\u8679\u6865\u706b\u8f66\u7ad9)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Xi Zhan (\u897f\u7ad9)'),
    'West Railway Station (\u897f\u7ad9)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Huo Che Dong Zhan (\u706b\u8f66\u4e1c\u7ad9)'),
    'East Railway Station (\u706b\u8f66\u4e1c\u7ad9)',
  )
  assert.equal(
    normalizeChineseStationDisplayName(
      'Taizhou Qiche Nanzhan (\u53f0\u5dde\u6c7d\u8f66\u5357\u7ad9)',
    ),
    'Taizhou Qiche Nanzhan (\u53f0\u5dde\u6c7d\u8f66\u5357\u7ad9)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Lujiazui (\u9646\u5bb6\u5634)'),
    'Lujiazui (\u9646\u5bb6\u5634)',
  )
  assert.equal(
    normalizeChineseStationDisplayName('Hekou (\u6cb3\u53e3)'),
    'Hekou (\u6cb3\u53e3)',
  )
})
