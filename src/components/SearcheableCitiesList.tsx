'use client'

import { cities, ICity } from '@/lib/citiesConfig'
import { Transition } from '@headlessui/react'
import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import CityCard from './CityCard'

const SearcheableCitiesList = () => {
  const [search, setSearch] = useState('')

  const fuse = useMemo(
    () =>
      new Fuse(cities, {
        keys: ['name'],
        minMatchCharLength: 2,
        threshold: 0.15,
        distance: 10,
      }),
    [],
  )

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  const continentOrder = useMemo(
    () => [
      'North America',
      'South America',
      'Europe',
      'Asia',
      'Australia',
      'Africa',
      'Oceania',
      'Antarctica',
    ],
    [],
  )

  const groupedCities = useMemo(() => {
    const continentMap = new Map<string, ICity[]>()

    sortedCities.forEach((city) => {
      if (!continentMap.has(city.continent)) {
        continentMap.set(city.continent, [])
      }
      continentMap.get(city.continent)!.push(city)
    })

    return Array.from(continentMap.entries())
      .sort((a, b) => {
        const aIndex = continentOrder.indexOf(a[0])
        const bIndex = continentOrder.indexOf(b[0])

        if (aIndex === -1 && bIndex === -1) {
          return a[0].localeCompare(b[0])
        }
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
      .map(([continent, cities]) => ({ continent, cities }))
  }, [sortedCities, continentOrder])

  const fullCitiesSet = useMemo(
    () => new Set(cities.map((city) => city.link)),
    [],
  )

  const results = useMemo(() => {
    const res = fuse.search(search)
    return search.length > 1
      ? new Set(res.map((result) => result.item.link))
      : fullCitiesSet
  }, [search, fuse, fullCitiesSet])

  const visibleGroups = useMemo(() => {
    return groupedCities
      .map(({ continent, cities }) => ({
        continent,
        cities: cities.filter((city) => results.has(city.link)),
      }))
      .filter((group) => group.cities.length > 0)
  }, [groupedCities, results])

  const hasResults = visibleGroups.length > 0

  let cardIndex = 0

  return (
    <div className="my-16 mt-16 sm:mt-20">
      <div className="relative mb-4 rounded-md shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-full border-0 px-10 py-4 pr-10 text-lg text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:leading-6 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-indigo-400"
          type="text"
          placeholder="Search for a city..."
        />

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-zinc-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"
            />
          </svg>
        </div>
      </div>
      {hasResults ? (
        <div className="space-y-10">
          {visibleGroups.map(({ continent, cities }, index) => (
            <section key={continent} className="space-y-6">
              <div>
                <h3 className="mb-4 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                  {continent}
                </h3>
                <div className="mx-auto grid max-w-full grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cities.map((city) => {
                    const rotationClass = ''
                    cardIndex += 1

                    return (
                      <Transition
                        key={city.link}
                        as="div"
                        appear
                        enterFrom="opacity-0 translate-y-4"
                        enter="transition-all ease-out duration-200"
                        leaveFrom="opacity-100 translate-y-0"
                        leave="transition-all ease-in duration-200"
                        show={true}
                      >
                        <CityCard city={city} className={rotationClass} />
                      </Transition>
                    )
                  })}
                </div>
              </div>
              {index < visibleGroups.length - 1 && (
                <footer>
                  <hr className="border-t border-zinc-200 dark:border-zinc-700" />
                </footer>
              )}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      {hasResults && <SuggestCity />}
    </div>
  )
}

const EmptyState = () => {
  return (
    <div className="w-full rounded bg-indigo-700 px-12 py-6 text-white">
      <h3 className="mb-2 text-lg font-medium">No results!</h3>
      <p>
        Want to play in your city? Shoot me a message on 𝕏{' '}
        <a href="https://x.com/_benjamintd">@_benjamintd</a>
      </p>
    </div>
  )
}

const SuggestCity = () => {
  return (
    <p className="mt-6">
      If you want the game to be available in your city, send me a message on 𝕏{' '}
      <a
        className="font-medium hover:underline"
        href="https://twitter.com/_benjamintd"
      >
        @_benjamintd
      </a>
      , or contribute on{' '}
      <a
        className="font-medium hover:underline"
        href="https://github.com/benjamintd/metro-memory.com"
      >
        Github
      </a>
      .
    </p>
  )
}

export default SearcheableCitiesList
