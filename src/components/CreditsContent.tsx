import Link from 'next/link'

import { GitHubIcon } from '@/components/SocialIcons'

const socialLinks = [
  {
    label: 'GitHub',
    href: 'https://github.com/norman-mei',
    Icon: GitHubIcon,
  },
]

export default function CreditsContent({ showBackLink = true }: { showBackLink?: boolean }) {
  return (
    <div className="max-w-3xl space-y-10 rounded-3xl bg-white/90 p-10 text-zinc-800 shadow-xl backdrop-blur-sm dark:bg-zinc-900/90 dark:text-zinc-100 dark:shadow-black/30">
      <header className="space-y-4">
        {showBackLink && (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-4 transition hover:text-indigo-800 hover:decoration-indigo-400 dark:text-indigo-300 dark:decoration-indigo-500 dark:hover:text-indigo-200"
          >
            <span aria-hidden="true">←</span> Back to main page
          </Link>
        )}
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">
          Credits
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400">
          Metro Memory is an open-source project created by{' '}
          <Link
            href="https://github.com/benjamintd"
            className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-500 dark:text-zinc-200 dark:decoration-zinc-600"
            target="_blank"
            rel="noreferrer"
          >
            Benjamin TD
          </Link>
          . This fork is maintained by{' '}
          <span className="font-semibold text-zinc-800 dark:text-zinc-100">
            Norman Mei
          </span>{' '}
          with additional improvements and data updates.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-[#18181b] dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Maintainer
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Norman curates new features, fresh data, and community feedback for
          this fork. Feel free to reach out, file issues, or share ideas.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {socialLinks.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-[#18181b] dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              aria-label={label}
            >
              <Icon className="h-4 w-4 fill-current" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-[#18181b] dark:bg-zinc-900">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Original Project
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The original Metro Memory experience—including many of the maps and
          gameplay mechanics—comes from the open source project by Benjamin TD.
          You can explore the source code, contribute improvements, or star the
          repository below.
        </p>
        <Link
          href="https://github.com/benjamintd/metro-memory.com"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 underline decoration-indigo-300 underline-offset-4 transition hover:decoration-indigo-500 dark:text-indigo-300 dark:decoration-indigo-500 dark:hover:decoration-indigo-400"
        >
          View the original repository
        </Link>
      </section>

      <footer className="pb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Want to see your city or rail network added? Open an issue on GitHub or
        send a pull request with data improvements.
      </footer>
    </div>
  )
}
