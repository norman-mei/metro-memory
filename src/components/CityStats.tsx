import _ from 'lodash'
import StatsGraph from './StatsGraph'
import { promises as fs } from 'fs'

const CityStats = async ({ name, slug }: { name: string; slug: string }) => {
  const features = await import(`@/app/(game)/${slug}/data/features.json`)
  const routes = await import(`@/app/(game)/${slug}/data/routes.json`)

  let cityStats: [string, number][] = []
  try {
    // load from file cache
    cityStats = JSON.parse(
      await fs.readFile(`public/stats/${slug}.json`, { encoding: 'utf-8' }),
    )
    console.log('loaded from file cache')
  } catch (error) {
    console.log(`loading ${slug} from API`)
    // scan all keys
    cityStats = await fetch('https://www.metro-memory.com/api/stats/' + slug, {
      cache: 'force-cache',
    }).then((res) => res.json())

    if (process.env.NODE_ENV !== 'production') {
      // save to file cache
      await fs.writeFile(
        `public/stats/${slug}.json`,
        JSON.stringify(cityStats),
        'utf-8',
      )
    }
  }

  const mapFeature = ([key, value]: [string, number]) => {
    const id = +key.replace(`${slug}-`, '')
    const feature = features.features.find((f: any) => f.id === id)

    if (!feature) {
      return null
    }

    return {
      id,
      name: feature.properties.name,
      value,
      line: feature.properties.line,
      geometry: feature.geometry,
    }
  }

  const reduceLines = (items: any[], index: number, array: any[]): any => {
    return items.reduce(
      (acc, item): any => ({
        name: item.name,
        value: item.value,
        geometry: item.geometry,
        lines: [...acc.lines, item.line],
        id: item.id,
        percentile: index / array.length,
      }),
      {
        lines: [],
        value: 0,
        name: '',
        geometry: null,
        id: 0,
        percentile: 0,
      },
    )
  }

  const values = _.chain(cityStats)
    .map(mapFeature)
    .filter(Boolean)
    .groupBy('name')
    .values()
    .map(reduceLines)
    .value() as any

  return (
    <div className="mx-auto w-full max-w-5xl rounded border bg-white p-2">
      <StatsGraph
        values={values}
        routes={JSON.parse(JSON.stringify(routes))}
        slug={slug}
      />
    </div>
  )
}

export default CityStats
