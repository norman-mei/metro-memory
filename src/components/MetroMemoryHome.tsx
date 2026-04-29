'use client'

import { Suspense } from 'react'

import { Avatar, AvatarContainer } from '@/components/Avatar'
import { Container } from '@/components/Container'


import LinkPreviews from '@/components/LinkPreviews'
import SearcheableCitiesList from '@/components/SearcheableCitiesList'
import Tweets from '@/components/Tweets'
import useTranslation from '@/hooks/useTranslation'



export default function MetroMemoryHome() {
  const { t } = useTranslation()
  return (
    <>
      <Container className="mt-9 bg-white dark:bg-black">
        <div className="w-full max-w-4xl lg:max-w-5xl">
          <div className="flex items-center gap-4">
            <AvatarContainer className="h-24 w-24">
              <Avatar large className="h-24 w-24" />
            </AvatarContainer>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
              {t('heroTitle')}
            </h1>
          </div>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            {t('heroSubtitle')}
          </p>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            {t('heroDesc1')}
          </p>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            {t('heroDesc2')}
          </p>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            {t('heroDesc3')}
            <br />
            <br />
            <a
              href="https://github.com/benjamintd/metro-memory.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 dark:text-zinc-200 dark:decoration-zinc-500 dark:hover:decoration-zinc-300"
            >
              {t('footerFork')}
            </a>
            .
          </p>
        </div>
        <Suspense>
          <SearcheableCitiesList
            testimonialsContent={<Tweets />}
            pressContent={<LinkPreviews />}
          />
        </Suspense>

        <p className="mt-6"></p>

      </Container>
    </>
  )
}
