import Link from 'next/link'

import { Container } from '@/components/Container'
import { GitHubIcon, LinkedInIcon, TwitterIcon } from '@/components/SocialIcons'

import Tweets from '@/components/Tweets'
import LinkPreviews from '@/components/LinkPreviews'
import ConfettiButton from '@/components/ConfettiButton'
import SearcheableCitiesList from '@/components/SearcheableCitiesList'

function SocialLink({
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & {
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link className="group -m-1 p-1" {...props}>
      <Icon className="h-6 w-6 fill-zinc-500 transition group-hover:fill-zinc-600 dark:fill-zinc-400 dark:group-hover:fill-zinc-300" />
    </Link>
  )
}

export default async function Home() {
  return (
    <>
      <Container className="mt-9">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 sm:text-5xl">
            Metro Memory{' '}
          </h1>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            Challenge yourself to remember the stations of your city&apos;s
            metro.
            <br />
            How well do you think know your city?
          </p>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            The goal is simple. Type as many of the stations as you can
            remember, and see them pop up on the map. No time limit.
          </p>
          <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
            If you do well, there might be some{' '}
            <ConfettiButton>confetti</ConfettiButton> involved.
          </p>
        </div>
        <SearcheableCitiesList />

        <p className="mt-6"></p>
        <div className="mt-6 flex gap-6">
          <SocialLink
            href="https://twitter.com/_benjamintd"
            aria-label="Follow on Twitter/X"
            icon={TwitterIcon}
          />
          <SocialLink
            href="https://github.com/benjamintd"
            aria-label="Follow on GitHub"
            icon={GitHubIcon}
          />
          <SocialLink
            href="https://linkedin.com/in/benjamintd"
            aria-label="Follow on LinkedIn"
            icon={LinkedInIcon}
          />
        </div>

        <h2 className="mt-12 text-4xl font-bold">
          What people say about Metro Memory
        </h2>
        <Tweets />

        <h2 className="mt-12 text-4xl font-bold">They talked about us</h2>
        <LinkPreviews />
      </Container>
    </>
  )
}
