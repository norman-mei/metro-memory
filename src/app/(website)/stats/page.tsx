import CityStats from '@/components/CityStats'
import { Container } from '@/components/Container'
import { cities } from '@/lib/citiesConfig'
import slugify from '@/lib/slugify'
import Link from 'next/link'

export const revalidate = 86400 // 24 hours
export const dynamic = 'force-static'

const hostedCities = cities
  .filter((city) => !city.hideInStats)
  .map((city) => ({
    slug: slugify(city),
    name: city.name,
  }))

const StatsPage = async () => {
  return (
    <Container>
      <h1 className="mb-6 text-center text-3xl font-bold">
        Stats of most found stations in each city
      </h1>
      <p className="mb-12 text-center text-gray-800">
        Spoilers ahead. If you want to play the game, avoid looking at this page
        and hovering the maps!
      </p>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:px-0">
        {hostedCities.map(({ slug, name }) => (
          <Link key={slug} href={`/stats/${slug}`}>
            {name}
          </Link>
        ))}
      </div>
    </Container>
  )
}

export default StatsPage
