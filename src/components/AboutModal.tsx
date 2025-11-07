'use client'

import { Fragment, SVGProps } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useConfig } from '@/lib/configContext'
import useTranslation from '@/hooks/useTranslation'

const GitHubLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="currentColor"
    focusable="false"
    {...props}
  >
    <path d="M12 0a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58l-.02-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.35-1.76-1.35-1.76-1.1-.76.08-.75.08-.75 1.2.09 1.83 1.24 1.83 1.24 1.08 1.84 2.83 1.31 3.52 1 .11-.79.42-1.31.76-1.61-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.47 5.92.43.38.81 1.12.81 2.26l-.02 3.35c0 .32.22.69.82.58A12 12 0 0 0 12 0Z" />
  </svg>
)

const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    href: 'https://github.com/norman-mei',
    Icon: GitHubLogo,
  },
] as const

export default function AboutModal({
  open,
  setOpen,
}: {
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { METADATA } = useConfig()
  const { t } = useTranslation()
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-zinc-900 dark:bg-opacity-80" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-black/40">
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-bold leading-6 text-gray-900 dark:text-zinc-100"
                    >
                      {METADATA.title as string}
                    </Dialog.Title>
                  </div>
                  <div className="mt-4 space-y-4 text-left">
                    <p className="text-sm text-gray-600 dark:text-zinc-300">
                      This fork is currently maintained by{' '}
                      <span className="font-semibold text-gray-900 dark:text-zinc-100">
                        Norman Mei
                      </span>
                      . Reach out or follow along on GitHub.
                    </p>
                    <div className="rounded-xl bg-gray-50 p-4 dark:bg-zinc-800/80">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        Connect with Norman
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-300">
                        Say hi, share feedback, or see what&apos;s next.
                      </p>
                      <div className="mt-4 flex justify-center gap-4">
                        {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                          <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={label}
                            title={label}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-600 shadow transition hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-zinc-100 dark:shadow-black/30"
                          >
                            <Icon className="h-5 w-5" />
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-4 dark:border-[#18181b] dark:bg-zinc-800/80">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        Original Project
                      </h4>
                      <p className="mt-1 text-sm text-gray-600 dark:text-zinc-300">
                        This fork builds on the open source{' '}
                        <a
                          href="https://github.com/benjamintd/metro-memory.com"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-500 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                        >
                          metro-memory.com repository
                        </a>{' '}
                        created by{' '}
                        <a
                          href="https://github.com/benjamintd"
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-500 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                        >
                          Benjamin TD
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md bg-zinc-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    onClick={() => setOpen(false)}
                  >
                    {t('backToTheGame')}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
