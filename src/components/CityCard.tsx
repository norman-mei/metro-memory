import { ICity } from '@/lib/citiesConfig'
import classNames from 'classnames'
import clsx from 'clsx'
import Link from 'next/link'
import Image from 'next/image'

const CityCard = ({ city, className }: { city: ICity; className?: string }) => {
  const Component = city.disabled ? 'div' : Link

  return (
    <Component
      href={city.link}
      key={city.link}
      className="group mt-4"
      aria-disabled={city.disabled}
    >
      <h1
        className={classNames('mb-4 text-2xl font-bold group-hover:underline', {
          'text-zinc-800 dark:text-zinc-100': !city.disabled,
          'text-zinc-400 dark:text-zinc-500': city.disabled,
        })}
      >
        {city.name}
        {city.disabled && ' (soon)'}
      </h1>
      <div
        className={clsx(
          'relative aspect-square w-52 flex-none overflow-hidden rounded-xl bg-zinc-100 shadow transition-all dark:bg-zinc-800 sm:rounded-2xl md:w-40 lg:w-52 xl:w-56',
          {
            'group-hover:shadow-lg group-hover:shadow-orange-300/60':
              !city.disabled,
            grayscale: city.disabled,
          },
          className,
        )}
      >
        <Image
          draggable={false}
          src={city.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </Component>
  )
}

export default CityCard
