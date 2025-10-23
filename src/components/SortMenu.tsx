import React, { Fragment, ReactNode } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import { SortIcon } from './SortIcon'
import { CheckIcon } from './CheckIcon'
import { SortOption, SortOptionType } from '@/lib/types'
import classNames from 'classnames'

export default function SortMenu({
  sortOptions,
  setSort,
  sort,
}: {
  sortOptions: SortOption[]
  setSort: (sort: SortOptionType) => void
  sort: SortOptionType
}) {
  return (
    <div className="h-8 w-24">
      <Listbox value={sort} onChange={setSort}>
        <div className="relative mt-1">
          <Listbox.Button className="relative flex w-full cursor-default items-center justify-between rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow focus:outline-none focus-visible:border-zinc-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300">
            <span className="whitespace-nowrap text-xs font-bold text-gray-600">
              {sortOptions.find((o) => o.id === sort)!.shortName}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <SortIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute right-0 z-30 mt-1 max-h-60 w-72 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {sortOptions.map((option) => (
                <Option key={option.id} option={option} />
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}

const Option = ({ option }: { option: SortOption }) => {
  return (
    <Listbox.Option value={option.id as string}>
      {({ selected, active }) => (
        <li
          className={classNames(
            'relative cursor-default select-none py-2 pl-10 pr-4',
            {
              'bg-zinc-100 text-zinc-900': active,
              'text-gray-900': !active,
            },
          )}
        >
          <span
            className={`block truncate ${
              selected ? 'font-medium' : 'font-normal'
            }`}
          >
            {option.name}
          </span>
          {selected ? (
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-600">
              <CheckIcon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </li>
      )}
    </Listbox.Option>
  )
}
