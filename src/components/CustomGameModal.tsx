'use client'

import { useConfig } from '@/lib/configContext'
import type { Line, LineGroup, LineGroupItem } from '@/lib/types'
import { useEffect, useMemo, useState } from 'react'

type VisibleLinesItem = {
  type: 'lines'
  title?: string
  lineIds: string[]
}

type VisibleGroup = {
  title?: string
  items: Array<VisibleLinesItem | { type: 'separator' }>
}

const buildOrderedLineIds = (
  lines: Record<string, Line>,
  lineGroups: LineGroup[] | undefined,
) => {
  const ordered: string[] = []
  const seen = new Set<string>()

  const addLine = (lineId: string) => {
    if (!lines[lineId] || seen.has(lineId)) {
      return
    }
    seen.add(lineId)
    ordered.push(lineId)
  }

  lineGroups?.forEach((group) => {
    group.items.forEach((item) => {
      if (item.type !== 'lines') {
        return
      }
      item.lines.forEach(addLine)
    })
  })

  Object.entries(lines)
    .sort(([, left], [, right]) => {
      const orderDelta = (left.order ?? 0) - (right.order ?? 0)
      if (orderDelta !== 0) {
        return orderDelta
      }
      return left.name.localeCompare(right.name)
    })
    .forEach(([lineId]) => addLine(lineId))

  return ordered
}

const buildVisibleGroups = (
  lines: Record<string, Line>,
  lineGroups: LineGroup[] | undefined,
  searchQuery: string,
) => {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchesLine = (lineId: string) => {
    if (!normalizedQuery) {
      return true
    }

    const line = lines[lineId]
    if (!line) {
      return false
    }

    return (
      lineId.toLowerCase().includes(normalizedQuery) ||
      line.name.toLowerCase().includes(normalizedQuery)
    )
  }

  const matchesText = (value?: string) =>
    !normalizedQuery || (value?.toLowerCase().includes(normalizedQuery) ?? false)

  const visibleGroups: VisibleGroup[] = []
  const groupedLineIds = new Set<string>()

  lineGroups?.forEach((group) => {
    const visibleItems: VisibleGroup['items'] = []

    group.items.forEach((item: LineGroupItem) => {
      if (item.type === 'separator') {
        if (
          visibleItems.length > 0 &&
          visibleItems[visibleItems.length - 1]?.type !== 'separator'
        ) {
          visibleItems.push(item)
        }
        return
      }

      const matchedLines = item.lines.filter((lineId) => {
        if (!lines[lineId]) {
          return false
        }
        if (matchesLine(lineId)) {
          return true
        }
        return matchesText(item.title) || matchesText(group.title)
      })

      if (matchedLines.length === 0) {
        return
      }

      matchedLines.forEach((lineId) => groupedLineIds.add(lineId))
      visibleItems.push({
        type: 'lines',
        title: item.title,
        lineIds: matchedLines,
      })
    })

    while (visibleItems.at(-1)?.type === 'separator') {
      visibleItems.pop()
    }

    if (visibleItems.length > 0) {
      visibleGroups.push({
        title: group.title,
        items: visibleItems,
      })
    }
  })

  const ungroupedLineIds = Object.keys(lines)
    .filter((lineId) => !groupedLineIds.has(lineId))
    .filter(matchesLine)
    .sort((left, right) => {
      const leftLine = lines[left]
      const rightLine = lines[right]
      const orderDelta = (leftLine?.order ?? 0) - (rightLine?.order ?? 0)
      if (orderDelta !== 0) {
        return orderDelta
      }
      return (leftLine?.name ?? left).localeCompare(rightLine?.name ?? right)
    })

  if (ungroupedLineIds.length > 0) {
    visibleGroups.push({
      title: 'Additional Lines',
      items: [
        {
          type: 'lines',
          lineIds: ungroupedLineIds,
        },
      ],
    })
  }

  return visibleGroups
}

const lineIconSrc = (
  iconBasePath: string | null,
  iconName: string | undefined,
) => {
  if (!iconName) {
    return null
  }

  return iconBasePath ? `${iconBasePath}/images/${iconName}` : `/images/${iconName}`
}

export default function CustomGameModal({
  isOpen,
  onCloseAction,
  parentSlug,
  iconBasePath = null,
}: {
  isOpen: boolean
  onCloseAction: () => void
  parentSlug: string
  iconBasePath?: string | null
}) {
  const { LINES, LINE_GROUPS, METADATA, CITY_NAME } = useConfig()
  const allLineIds = useMemo(
    () => buildOrderedLineIds(LINES || {}, LINE_GROUPS),
    [LINES, LINE_GROUPS],
  )
  const [selectedLines, setSelectedLines] = useState<Set<string>>(
    () => new Set(allLineIds),
  )
  const [title, setTitle] = useState(
    `${METADATA?.title ?? 'Map'} - Custom Layout`,
  )
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setSelectedLines(new Set(allLineIds))
    setTitle(`${METADATA?.title ?? 'Map'} - Custom Layout`)
    setSearchQuery('')
  }, [CITY_NAME, METADATA?.title, allLineIds, isOpen])

  const visibleGroups = useMemo(
    () => buildVisibleGroups(LINES || {}, LINE_GROUPS, searchQuery),
    [LINES, LINE_GROUPS, searchQuery],
  )
  const visibleLineIds = useMemo(
    () =>
      visibleGroups.flatMap((group) =>
        group.items.flatMap((item) =>
          item.type === 'lines' ? item.lineIds : [],
        ),
      ),
    [visibleGroups],
  )

  if (!isOpen) return null

  const setLineSelection = (lineIds: string[], shouldSelect: boolean) => {
    setSelectedLines((current) => {
      const next = new Set(current)
      lineIds.forEach((lineId) => {
        if (shouldSelect) {
          next.add(lineId)
        } else {
          next.delete(lineId)
        }
      })
      return next
    })
  }

  const handleToggle = (id: string) => {
    setSelectedLines((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = () => {
    if (selectedLines.size === 0) {
      alert('You must select at least one line to play.')
      return
    }

    const orderedSelection = allLineIds.filter((lineId) => selectedLines.has(lineId))
    const customTitle = title.trim() || `${METADATA?.title ?? 'Map'} - Custom Layout`
    const url = new URL(window.location.origin + '/custom')
    url.searchParams.set('parent', parentSlug)
    url.searchParams.set('lines', orderedSelection.join(','))
    url.searchParams.set('title', customTitle)

    if (navigator.clipboard) {
      try {
        void navigator.clipboard.writeText(url.toString())
      } catch {
        // ignore
      }
    }

    window.location.href = url.toString()
  }

  const selectedCount = selectedLines.size
  const totalCount = allLineIds.length
  const visibleCount = visibleLineIds.length

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onCloseAction}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCloseAction}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          aria-label="Close"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </button>

        <div className="mb-5 shrink-0 pr-10">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Create Custom Layout
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Build a subset from the current city or mini city while keeping the
            original headers, subheaders, and progress scope.
          </p>
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Custom Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 focus:border-[var(--accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="My Custom Game"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
              Search Lines
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 shadow-sm transition hover:border-zinc-300 focus:border-[var(--accent-500)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Search by line, id, or header"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/60">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {selectedCount}/{totalCount} lines selected
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {visibleCount} visible
          </span>
          <button
            type="button"
            onClick={() => setLineSelection(allLineIds, true)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setLineSelection(allLineIds, false)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setLineSelection(visibleLineIds, true)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Select visible
          </button>
          <button
            type="button"
            onClick={() => setLineSelection(visibleLineIds, false)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Clear visible
          </button>
        </div>

        <div className="mb-6 flex min-h-0 flex-1 flex-col overflow-hidden">
          <label className="mb-3 block shrink-0 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            Select Lines to Include
          </label>
          <div className="flex-1 overflow-y-auto pr-2">
            {visibleGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No lines match this search.
              </div>
            ) : (
              <div className="space-y-5">
                {visibleGroups.map((group, groupIndex) => {
                  const groupLineIds = group.items.flatMap((item) =>
                    item.type === 'lines' ? item.lineIds : [],
                  )
                  const selectedInGroup = groupLineIds.filter((lineId) =>
                    selectedLines.has(lineId),
                  ).length

                  return (
                    <section
                      key={`${group.title ?? 'group'}-${groupIndex}`}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/50"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {group.title ?? 'Line Group'}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {selectedInGroup}/{groupLineIds.length} selected
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLineSelection(groupLineIds, true)}
                          className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setLineSelection(groupLineIds, false)}
                          className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          None
                        </button>
                      </div>

                      <div className="space-y-3">
                        {group.items.map((item, itemIndex) => {
                          if (item.type === 'separator') {
                            return (
                              <hr
                                key={`separator-${groupIndex}-${itemIndex}`}
                                className="border-zinc-200 dark:border-zinc-800"
                              />
                            )
                          }

                          const selectedInItem = item.lineIds.filter((lineId) =>
                            selectedLines.has(lineId),
                          ).length

                          return (
                            <div
                              key={`${item.title ?? 'item'}-${groupIndex}-${itemIndex}`}
                              className="space-y-2"
                            >
                              {(item.title || item.lineIds.length > 1) && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                                      {item.title ?? 'Lines'}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                      {selectedInItem}/{item.lineIds.length} selected
                                    </p>
                                  </div>
                                  {item.lineIds.length > 1 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setLineSelection(item.lineIds, true)}
                                        className="rounded-full border border-zinc-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                      >
                                        All
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setLineSelection(item.lineIds, false)}
                                        className="rounded-full border border-zinc-300 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                      >
                                        None
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              <div className="grid gap-1">
                                {item.lineIds.map((lineId) => {
                                  const line = LINES?.[lineId]
                                  if (!line) {
                                    return null
                                  }

                                  const iconSrc = lineIconSrc(iconBasePath, line.icon)
                                  return (
                                    <label
                                      key={lineId}
                                      className="flex cursor-pointer items-center gap-3 rounded-xl p-2 transition hover:bg-white/80 dark:hover:bg-zinc-900/60"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedLines.has(lineId)}
                                        onChange={() => handleToggle(lineId)}
                                        className="h-5 w-5 rounded border-zinc-300 bg-white text-[var(--accent-600)] focus:ring-[var(--accent-500)] dark:border-zinc-700 dark:bg-zinc-900"
                                      />
                                      <div className="flex min-w-0 items-center gap-2">
                                        {iconSrc && (
                                          <img
                                            src={iconSrc}
                                            className="h-6 w-6 object-contain"
                                            alt=""
                                          />
                                        )}
                                        <div className="min-w-0">
                                          <span className="block truncate font-semibold text-zinc-900 dark:text-zinc-100">
                                            {line.name}
                                          </span>
                                          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                            {lineId}
                                          </span>
                                        </div>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            onClick={handleCreate}
            className="w-full rounded-xl bg-[var(--accent-600)] py-3 text-base font-bold text-white transition hover:bg-[var(--accent-700)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
          >
            Play Custom Game & Copy Link
          </button>
        </div>
      </div>
    </div>
  )
}
