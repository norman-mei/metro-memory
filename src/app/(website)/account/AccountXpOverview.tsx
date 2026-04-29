import { getCurrentUser } from '@/lib/auth'
import { getProgressionSnapshot } from '@/lib/progression'
import XpProgressCard from '@/components/XpProgressCard'

export default async function AccountXpOverview() {
  const user = await getCurrentUser()

  if (!user) {
    return (
      <XpProgressCard
        eyebrow="Career XP"
        title="Account progression"
        description="Sign in to track lifetime XP, levels, and season progress."
        valueLabel="Sign in required"
        progress={0}
        disabled
      />
    )
  }

  const progression = await getProgressionSnapshot(user.id)

  return (
    <XpProgressCard
      eyebrow="Career XP"
      title={`Level ${progression.career.level}`}
      description={`${progression.career.lifetimeXp.toLocaleString()} total XP earned across all ranked play.`}
      valueLabel={`${progression.career.xpIntoLevel.toLocaleString()} / ${progression.career.xpForNextLevel.toLocaleString()}`}
      progress={
        progression.career.xpForNextLevel > 0
          ? progression.career.xpIntoLevel / progression.career.xpForNextLevel
          : 0
      }
    />
  )
}
