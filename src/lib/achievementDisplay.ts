import { formatLocalizedCityName } from '@/lib/cityNameDisplay'

type AchievementDisplayInput = {
  slug: string
  cityName: string
  title: string
  description: string
  secretDescription?: string
}

type AchievementDisplayOutput = {
  cityName: string
  title: string
  description: string
  secretDescription?: string
}

type AchievementCopy = {
  title: string
  description: string
  secretDescription?: string
}

const SIMPLIFIED_GLOBAL_COPY: Record<string, AchievementCopy> = {
  flawless: {
    title: '完美路线',
    description: '零失误完成任意城市。',
  },
  'almost-flawless': {
    title: '近乎完美',
    description: '以两次或更少失误完成任意城市。',
  },
  'comeback-kid': {
    title: '逆转高手',
    description: '从低于 50% 的进度追回并完成一座城市。',
  },
  'explorer-3': {
    title: '新手探索者',
    description: '完成 3 座不同城市。',
  },
  'explorer-10': {
    title: '探索者',
    description: '完成 10 座不同城市。',
  },
  'explorer-25': {
    title: '老练探索者',
    description: '完成 25 座不同城市。',
  },
  'explorer-50': {
    title: '终极探索者',
    description: '完成 50 座不同城市。',
  },
  'streak-7': {
    title: '连续打卡 I',
    description: '保持 7 天连续游玩记录。',
  },
  'streak-30': {
    title: '连续打卡 II',
    description: '保持 30 天连续游玩记录。',
  },
  'streak-90': {
    title: '连续打卡 III',
    description: '保持 90 天连续游玩记录。',
  },
  'streak-180': {
    title: '连续打卡 IV',
    description: '保持 180 天连续游玩记录。',
  },
  'twin-city': {
    title: '双城记',
    description: '在同一天完成两座来自不同洲的城市。',
  },
  'station-collector': {
    title: '车站收藏家',
    description: '在所有城市中找到 1,000 座车站。',
  },
  'line-finisher': {
    title: '线路征服者',
    description: '完成 5 条不同线路。',
  },
  'big-city-tamer': {
    title: '大城驯服者',
    description: '完成一座拥有 1,500+ 车站的城市。',
  },
  'all-rounder': {
    title: '全能玩家',
    description: '完成 3 个不同洲的城市。',
  },
  'globe-trotter': {
    title: '环球行者',
    description: '完成 6 个不同洲的城市。',
  },
  marathoner: {
    title: '马拉松选手',
    description: '在所有城市中找到 10,000 座车站。',
  },
  'typo-free': {
    title: '零错字',
    description: '不使用退格键或删除键完成一座城市。',
  },
  'perfect-start': {
    title: '完美开局',
    description: '在一座城市开局连续猜对 25 站。',
  },
  'never-repeat': {
    title: '不重不漏',
    description: '完成一座城市且不重复猜测已找到的车站。',
  },
  'weekend-warrior': {
    title: '周末战士',
    description: '连续 8 个周末游玩。',
  },
  'monthly-commuter': {
    title: '月度通勤者',
    description: '在 3 个不同月份中游玩。',
  },
  'favorites-first': {
    title: '收藏优先',
    description: '完成 5 座已收藏城市。',
  },
  underdog: {
    title: '以小博大',
    description: '完成一座少于 20 座车站的城市。',
  },
  'golden-ratio': {
    title: '黄金分割',
    description: '???',
    secretDescription: '在任意城市达到 61.8% 完成度。',
  },
  'the-commuter': {
    title: '通勤者',
    description: '???',
    secretDescription: '在 7 分钟内猜对 7 站。',
  },
  'the-archivist': {
    title: '档案管理员',
    description: '???',
    secretDescription: '打开 10 座不同城市的统计面板。',
  },
  'metro-memory-master': {
    title: '终极完成者',
    description: '解锁所有城市成就即可获得这枚最终徽章。',
  },
}

const TRADITIONAL_GLOBAL_COPY: Record<string, AchievementCopy> = {
  flawless: {
    title: '完美路線',
    description: '零失誤完成任意城市。',
  },
  'almost-flawless': {
    title: '近乎完美',
    description: '以兩次或更少失誤完成任意城市。',
  },
  'comeback-kid': {
    title: '逆轉高手',
    description: '從低於 50% 的進度追回並完成一座城市。',
  },
  'explorer-3': {
    title: '新手探索者',
    description: '完成 3 座不同城市。',
  },
  'explorer-10': {
    title: '探索者',
    description: '完成 10 座不同城市。',
  },
  'explorer-25': {
    title: '老練探索者',
    description: '完成 25 座不同城市。',
  },
  'explorer-50': {
    title: '終極探索者',
    description: '完成 50 座不同城市。',
  },
  'streak-7': {
    title: '連續打卡 I',
    description: '保持 7 天連續遊玩紀錄。',
  },
  'streak-30': {
    title: '連續打卡 II',
    description: '保持 30 天連續遊玩紀錄。',
  },
  'streak-90': {
    title: '連續打卡 III',
    description: '保持 90 天連續遊玩紀錄。',
  },
  'streak-180': {
    title: '連續打卡 IV',
    description: '保持 180 天連續遊玩紀錄。',
  },
  'twin-city': {
    title: '雙城記',
    description: '在同一天完成兩座來自不同洲的城市。',
  },
  'station-collector': {
    title: '車站收藏家',
    description: '在所有城市中找到 1,000 座車站。',
  },
  'line-finisher': {
    title: '線路征服者',
    description: '完成 5 條不同線路。',
  },
  'big-city-tamer': {
    title: '大城馴服者',
    description: '完成一座擁有 1,500+ 車站的城市。',
  },
  'all-rounder': {
    title: '全能玩家',
    description: '完成 3 個不同洲的城市。',
  },
  'globe-trotter': {
    title: '環球行者',
    description: '完成 6 個不同洲的城市。',
  },
  marathoner: {
    title: '馬拉松選手',
    description: '在所有城市中找到 10,000 座車站。',
  },
  'typo-free': {
    title: '零錯字',
    description: '不使用退格鍵或刪除鍵完成一座城市。',
  },
  'perfect-start': {
    title: '完美開局',
    description: '在一座城市開局連續猜對 25 站。',
  },
  'never-repeat': {
    title: '不重不漏',
    description: '完成一座城市且不重複猜測已找到的車站。',
  },
  'weekend-warrior': {
    title: '週末戰士',
    description: '連續 8 個週末遊玩。',
  },
  'monthly-commuter': {
    title: '月度通勤者',
    description: '在 3 個不同月份中遊玩。',
  },
  'favorites-first': {
    title: '收藏優先',
    description: '完成 5 座已收藏城市。',
  },
  underdog: {
    title: '以小博大',
    description: '完成一座少於 20 座車站的城市。',
  },
  'golden-ratio': {
    title: '黃金分割',
    description: '???',
    secretDescription: '在任意城市達到 61.8% 完成度。',
  },
  'the-commuter': {
    title: '通勤者',
    description: '???',
    secretDescription: '在 7 分鐘內猜對 7 站。',
  },
  'the-archivist': {
    title: '檔案管理員',
    description: '???',
    secretDescription: '開啟 10 座不同城市的統計面板。',
  },
  'metro-memory-master': {
    title: '終極完成者',
    description: '解鎖所有城市成就即可獲得這枚最終徽章。',
  },
}

const isSimplifiedChinese = (language?: string) => language === 'zh-CN'
const isTraditionalChinese = (language?: string) => language === 'zh-TW'

export const formatAchievementDisplayMeta = (
  meta: AchievementDisplayInput,
  language?: string,
): AchievementDisplayOutput => {
  const localizedCityName = formatLocalizedCityName(meta.cityName, meta.slug, language)
  if (!isSimplifiedChinese(language) && !isTraditionalChinese(language)) {
    return {
      cityName: localizedCityName,
      title: meta.title,
      description: meta.description,
      secretDescription: meta.secretDescription,
    }
  }

  const overrides = isSimplifiedChinese(language)
    ? SIMPLIFIED_GLOBAL_COPY
    : TRADITIONAL_GLOBAL_COPY
  const override = overrides[meta.slug]
  if (override) {
    return {
      cityName: localizedCityName,
      title: override.title,
      description: override.description,
      secretDescription: override.secretDescription,
    }
  }

  const genericTitle = `${meta.cityName} Completionist`
  const genericDescription = `You found every station in ${meta.cityName}!`
  if (meta.title === genericTitle && meta.description === genericDescription) {
    return {
      cityName: localizedCityName,
      title: isSimplifiedChinese(language)
        ? `${localizedCityName} 全站制霸`
        : `${localizedCityName} 全站制霸`,
      description: isSimplifiedChinese(language)
        ? `你找到了 ${localizedCityName} 的每一座车站！`
        : `你找到了 ${localizedCityName} 的每一座車站！`,
    }
  }

  return {
    cityName: localizedCityName,
    title: meta.title,
    description: meta.description,
    secretDescription: meta.secretDescription,
  }
}
