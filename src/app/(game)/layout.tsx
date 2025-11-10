import ThemeProviderClient from '@/components/ThemeProviderClient'
import { AuthProvider } from '@/context/AuthContext'
import { SettingsProvider } from '@/context/SettingsContext'

export default function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProviderClient>
      <SettingsProvider>
        <AuthProvider>{children}</AuthProvider>
      </SettingsProvider>
    </ThemeProviderClient>
  )
}
