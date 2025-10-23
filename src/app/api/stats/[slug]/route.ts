import { kv } from '@vercel/kv'
import { zip, sortBy, filter } from 'lodash'
import { promises as fs } from 'fs'

export const revalidate = 600 // 10 minutes

export const GET = async (
  req: Request,
  { params }: { params: { slug: string } },
) => {
  const { slug } = params
  const [_cursor, keys] = await kv.scan(0, {
    match: `${slug}-*`,
    count: 10000,
  })

  const counts = zip(
    keys,
    await Promise.all(keys.map(async (key) => (await kv.get(key)) as number)),
  ) as [string, number][]

  const data = sortBy(
    filter(counts, ([key]) => key!.startsWith(`${slug}`)),
    ([_, v]) => -v!,
  ) as [string, number][]

  // cache in dev
  if (process.env.NODE_ENV !== 'production') {
    await fs.writeFile(
      `public/stats/${slug}.json`,
      JSON.stringify(data, null, 2),
    )
  }

  return new Response(JSON.stringify(data))
}
