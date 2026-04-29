import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import Main from '@/components/Main'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 flex justify-center sm:px-8">
        <div className="flex w-full max-w-7xl lg:px-8">
          <div className="w-full bg-white dark:bg-black" />
        </div>
      </div>
      <div className="relative flex w-full flex-col min-h-screen">
        <Header />
        <Main className="flex-auto">{children}</Main>
        <Footer />
      </div>
    </>
  )
}
