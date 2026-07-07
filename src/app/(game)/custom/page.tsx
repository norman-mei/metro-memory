import GamePage from '@/components/GamePage'
import Main from '@/components/Main'
import { Provider } from '@/lib/configContext'
import { loadCustomMiniCityAssets } from '@/lib/miniCityRuntime'
import { loadCustomWorldMapAssets } from '@/lib/customWorldMap'
import { decodeWorldSelection } from '@/lib/customWorldMapSelection'
import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

const getMainClassName = (parentSlug: string) =>
  parentSlug === 'gba' ? 'font-cjk min-h-screen' : 'min-h-screen'

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

const firstParam = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? null : null

export async function generateMetadata(
  { searchParams }: PageProps,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await searchParams
  const title = firstParam(params.title) ?? 'Custom Layout'

  const sel = firstParam(params.sel)
  if (params.world === '1' && sel) {
    const selection = decodeWorldSelection(sel)
    if (!selection) {
      return {}
    }
    const assets = await loadCustomWorldMapAssets(selection, title)
    return assets?.config.METADATA ?? {}
  }

  const parentSlug = firstParam(params.parent)
  const lines = firstParam(params.lines)
  if (!parentSlug || !lines) {
    return {}
  }

  const assets = await loadCustomMiniCityAssets(parentSlug, lines, title)
  return assets?.config.METADATA ?? {}
}

export default async function CustomGameRoute({ searchParams }: PageProps) {
  const params = await searchParams
  const title = firstParam(params.title) ?? 'Custom Layout'

  const sel = firstParam(params.sel)
  if (params.world === '1' && sel) {
    const selection = decodeWorldSelection(sel)
    if (!selection) {
      notFound()
    }
    const assets = await loadCustomWorldMapAssets(selection!, title)
    if (!assets) {
      notFound()
    }
    return (
      <Provider value={assets!.config}>
        <Main className="min-h-screen">
          <GamePage fc={assets!.features} routes={assets!.routes} />
        </Main>
      </Provider>
    )
  }

  const parentSlug = firstParam(params.parent)
  const lines = firstParam(params.lines)
  if (!parentSlug || !lines) {
    notFound()
  }

  const assets = await loadCustomMiniCityAssets(parentSlug!, lines!, title)
  if (!assets) {
    notFound()
  }

  return (
    <Provider value={assets!.config}>
      <Main className={getMainClassName(assets!.definition.parentSlug)}>
        <GamePage fc={assets!.features} routes={assets!.routes} />
      </Main>
    </Provider>
  )
}
