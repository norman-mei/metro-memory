'use client'

import { Fragment, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import MenuIcon from './MenuIcon'
import classNames from 'classnames'
import AboutModal from './AboutModal'
import useTranslation from '@/hooks/useTranslation'

export default function MenuComponent({
  onReset,
  setHideLabels,
  hideLabels,
  onRevealSolutions,
}: {
  onReset: () => void
  hideLabels: boolean
  setHideLabels: (hide: boolean) => void
  onRevealSolutions: () => void
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const { t } = useTranslation()

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex h-12 w-12 items-center justify-center gap-x-1.5 rounded-full bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-lg outline-none ring-zinc-800 hover:bg-gray-50 focus:ring-2">
          <MenuIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block w-full px-4 py-2 text-left text-sm',
                  )}
                  onClick={onReset}
                >
                  {t('startOver')}
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block w-full px-4 py-2 text-left text-sm',
                  )}
                  onClick={onRevealSolutions}
                >
                  {t('showSolutions')}
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block w-full px-4 py-2 text-left text-sm',
                  )}
                  onClick={() => setHideLabels(!hideLabels)}
                >
                  {hideLabels ? t('showLabels') : t('hideLabels')}
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  className={classNames(
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                    'block w-full px-4 py-2 text-left text-sm',
                  )}
                  onClick={() => setModalOpen(true)}
                >
                  {t('about')}
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
      <AboutModal open={modalOpen} setOpen={setModalOpen} />
    </Menu>
  )
}
