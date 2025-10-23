import { kv } from '@vercel/kv'

export const POST = async (req: Request) => {
  const { matches } = await req.json()

  await Promise.all(
    matches.map(async (match: string) => {
      await kv.incr(`${match}`)
    }),
  )

  return new Response('OK')
}
