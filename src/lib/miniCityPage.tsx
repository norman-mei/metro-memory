import GamePage from '@/components/GamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import { loadMiniCityPageAssets } from '@/lib/miniCityRuntime'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

const getMainClassName = (parentSlug: string) =>
  parentSlug === 'gba' ? 'font-cjk min-h-screen' : 'min-h-screen'

export const generateMiniCityMetadata = async (
  slug: string,
): Promise<Metadata> => {
  const assets = await loadMiniCityPageAssets(slug)
  return assets?.config.METADATA ?? {}
}

export const renderMiniCityPage = async (slug: string) => {
  const assets = await loadMiniCityPageAssets(slug)
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
