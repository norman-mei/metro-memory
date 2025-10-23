import Analytics from '@/components/Analytics'
import '@/styles/tailwind.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-zinc-50 text-zinc-900 antialiased dark:bg-black dark:text-zinc-100">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
