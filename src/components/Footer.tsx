'use client'

import Link from 'next/link'

import { ContainerInner, ContainerOuter } from '@/components/Container'
import useTranslation from '@/hooks/useTranslation'

function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="transition hover:text-teal-500 dark:hover:text-teal-400"
    >
      {children}
    </Link>
  )
}

export function Footer() {
  const { t } = useTranslation()
  const footerCopyright = t('footerCopyright')

  return (
    <footer className="mt-32 flex-none">
      <ContainerOuter>
        <div className="pb-16 pt-10">
          <ContainerInner>
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                {typeof footerCopyright === 'string' && footerCopyright !== 'footerCopyright'
                  ? footerCopyright.replace('{year}', String(new Date().getFullYear()))
                  : `© ${new Date().getFullYear()} kirklandwaterbot. All rights reserved.`}
              </p>
            </div>
          </ContainerInner>
        </div>
      </ContainerOuter>
    </footer>
  )
}
