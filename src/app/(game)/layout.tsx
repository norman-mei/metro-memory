import ThemeProviderClient from '@/components/ThemeProviderClient'

export default function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ThemeProviderClient>{children}</ThemeProviderClient>
}
