import GamePage from '@/components/GamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import { loadCustomMiniCityAssets } from '@/lib/miniCityRuntime'
import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

const getMainClassName = (parentSlug: string) =>
  parentSlug === 'gba' ? 'font-cjk min-h-screen' : 'min-h-screen'

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { searchParams }: PageProps,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await searchParams
  const parentSlug = params.parent
  const lines = params.lines
  const title = params.title

  if (typeof parentSlug !== 'string' || typeof lines !== 'string') {
    return {}
  }

  const customTitle = typeof title === 'string' ? title : 'Custom Layout'
  const assets = await loadCustomMiniCityAssets(parentSlug, lines, customTitle)
  return assets?.config.METADATA ?? {}
}

export default async function CustomGameRoute({ searchParams }: PageProps) {
  const params = await searchParams
  const parentSlug = params.parent
  const lines = params.lines
  const title = params.title

  if (typeof parentSlug !== 'string' || typeof lines !== 'string') {
    notFound()
  }

  const customTitle = typeof title === 'string' ? title : 'Custom Layout'
  const linesStr = lines

  const assets = await loadCustomMiniCityAssets(
    parentSlug,
    linesStr,
    customTitle,
  )
  if (!assets) {
    notFound()
  }

  return (
    <Provider value={assets.config}>
      <Main className={getMainClassName(assets.definition.parentSlug)}>
        <GamePage fc={assets.features} routes={assets.routes} />
      </Main>
    </Provider>
  )
}
