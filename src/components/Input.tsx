'use client'

import useNormalizeString from '@/hooks/useNormalizeString'
import usePushEvent from '@/hooks/usePushEvent'
import useTranslation from '@/hooks/useTranslation'
import { useConfig } from '@/lib/configContext'
import { DEFAULT_AUTO_SUBMIT_ON_MATCH } from '@/lib/guessInputDefaults'
import { appendMissedGuess } from '@/lib/missedGuesses'
import {
  findExactStationMatches,
  shouldAutoSubmitStationInput,
} from '@/lib/stationMatching'
import { DataFeature } from '@/lib/types'
import { Transition } from '@headlessui/react'
import classNames from 'classnames'
import Fuse from 'fuse.js'
import {
  CompositionEventHandler,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { MdClose, MdHistory } from 'react-icons/md'

const MENU_TOGGLE_EVENT = 'metro-memory:menu-toggle'

type GuessHistoryEntry = {
  id: string
  value: string
  type: 'correct' | 'already' | 'wrong'
  stationNames: string[]
  createdAt: string
}

const guessHistoryLabels: Record<GuessHistoryEntry['type'], string> = {
  correct: 'Correct',
  already: 'Already found',
  wrong: 'Missed',
}

const guessHistoryIcons: Record<GuessHistoryEntry['type'], string> = {
  correct: '✅',
  already: '✅',
  wrong: '❌',
}

const Input = ({
  fuse,
  found,
  setFound,
  setFoundTimestamps,
  setIsNewPlayer,
  inputRef,
  map,
  idMap,
  clusterGroups,
  autoFocus = true,
  disabled = false,
  onGuessResult,
  onInputEdit,
  autoSubmitOnMatch = DEFAULT_AUTO_SUBMIT_ON_MATCH,
  strictMatching = false,
  forgivingMatching = false,
}: {
  fuse: Fuse<DataFeature>
  found: number[]
  setFound: (found: number[]) => void
  setFoundTimestamps: (
    updater: (prev: Record<string, string>) => Record<string, string>,
  ) => void
  setIsNewPlayer: (isNewPlayer: boolean) => void
  inputRef: React.RefObject<HTMLInputElement>
  map: mapboxgl.Map | null
  idMap: Map<number, DataFeature>
  clusterGroups: Map<number, number[]>
  autoFocus?: boolean
  disabled?: boolean
  autoSubmitOnMatch?: boolean
  strictMatching?: boolean
  forgivingMatching?: boolean
  onGuessResult?: (result: {
    type: 'correct' | 'already' | 'wrong'
    addedIds?: number[]
    rawInput?: string
    normalizedInput?: string
    suggestions?: string[]
  }) => void
  onInputEdit?: (action: 'backspace' | 'delete') => void
}) => {
  const { t } = useTranslation()
  const normalizeString = useNormalizeString()
  const { CITY_NAME } = useConfig()
  const [search, setSearch] = useState<string>('')
  const [history, setHistory] = useState<string[]>([])
  const [guessHistory, setGuessHistory] = useState<GuessHistoryEntry[]>([])
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [wrong, setWrong] = useState<boolean>(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const wrongTimeoutRef = useRef<number | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const successTimeoutRef = useRef<number | null>(null)
  const [alreadyFound, setAlreadyFound] = useState<boolean>(false)
  const pushEvent = usePushEvent()
  const lastSearchRef = useRef<string>('')
  const isComposingRef = useRef(false)
  const submitAfterCompositionRef = useRef(false)
  const suppressEnterUntilRef = useRef(0)
  useEffect(() => {
    return () => {
      if (wrongTimeoutRef.current) {
        window.clearTimeout(wrongTimeoutRef.current)
        wrongTimeoutRef.current = null
      }
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current)
        successTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleMenuToggle = () => {
      setHistoryPanelOpen(false)
    }

    window.addEventListener(MENU_TOGGLE_EVENT, handleMenuToggle)
    return () => {
      window.removeEventListener(MENU_TOGGLE_EVENT, handleMenuToggle)
    }
  }, [])

  const triggerWrong = useCallback(() => {
    setWrong(true)
    if (wrongTimeoutRef.current) {
      window.clearTimeout(wrongTimeoutRef.current)
    }
    wrongTimeoutRef.current = window.setTimeout(() => setWrong(false), 1000)
  }, [])

  const triggerSuccess = useCallback(() => {
    setSuccess(true)
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current)
    }
    successTimeoutRef.current = window.setTimeout(() => setSuccess(false), 1000)
  }, [])

  const pushHistory = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    setHistory((prev) => {
      const next = [...prev, trimmed]
      if (next.length > 100) {
        next.shift()
      }
      return next
    })
    setHistoryIndex(null)
  }, [])

  const pushGuessHistory = useCallback(
    (entry: Omit<GuessHistoryEntry, 'id' | 'createdAt'>) => {
      const value = entry.value.trim()
      if (!value) return
      setGuessHistory((prev) => [
        {
          ...entry,
          value,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 100))
    },
    [],
  )

  const stripOptionalPrefixes = useCallback(
    (value: string) => {
      if (CITY_NAME !== 'nyc') {
        return value
      }
      const prefixes = [
        'astoria',
        'norwood',
        'harlem',
        'union sq',
        'union square',
        'nyu',
        'coney island',
      ]

      let result = value.trim()
      let changed = true

      while (changed) {
        changed = false

        for (const prefix of prefixes) {
          const candidate = `${prefix} `
          if (
            result.startsWith(candidate) &&
            result.length > candidate.length
          ) {
            result = result.slice(candidate.length).trim()
            changed = true
            break
          }
        }
      }

      return result
    },
    [CITY_NAME],
  )

  const submitGuess = useCallback(
    (value: string, mode: 'manual' | 'auto') => {
      if (disabled) return
      if (!value.trim()) return

      try {
        const sanitizedSearch = stripOptionalPrefixes(
          normalizeString(value),
        )
        if (!sanitizedSearch) return
        const isNonLatinSearch = /[\u3100-\u312f\u31a0-\u31bf\u3400-\u4dbf\u4e00-\u9fff]/.test(
          sanitizedSearch,
        )
        const results = fuse.search(sanitizedSearch)
        const nyTerminalNumber =
          CITY_NAME === 'nyc' || CITY_NAME === 'regional-rail'
            ? sanitizedSearch.match(/\bterminal\s*([1-8])\b/i)?.[1]
            : undefined
        const foundSet = new Set(found || [])
        const candidateMatches: Array<{ id: number; exactStrength: number }> =
          findExactStationMatches(
            idMap.values(),
            sanitizedSearch,
            normalizeString,
            stripOptionalPrefixes,
          )
        const candidateIdSet = new Set(candidateMatches.map((candidate) => candidate.id))
        let hasCandidate = candidateMatches.length > 0
        const suggestionNames: string[] = []
        const suggestionNameSet = new Set<string>()

        const addSuggestion = (feature: DataFeature) => {
          if (suggestionNames.length >= 5) return
          const id = Number(feature.id)
          if (Number.isFinite(id) && foundSet.has(id)) return
          const name = feature.properties?.name
          if (typeof name !== 'string' || !name.trim()) return
          const normalizedName = normalizeString(name)
          if (!normalizedName || normalizedName === sanitizedSearch) return
          if (suggestionNameSet.has(name)) return
          suggestionNameSet.add(name)
          suggestionNames.push(name)
        }

        for (let i = 0; i < results.length; i++) {
          const result = results[i]
          if ((result.score ?? 1) <= (forgivingMatching ? 0.35 : 0.25)) {
            addSuggestion(result.item)
          }
          const propertiesWithAlternates = result.item.properties as typeof result.item.properties & {
            alternate_names?: string[]
          }
          const exactPrimaryCandidates = [
            result.item.properties?.name,
            result.item.properties?.long_name,
            result.item.properties?.short_name,
          ]
            .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
            .map((entry) => stripOptionalPrefixes(normalizeString(entry)))
          const exactAlternateCandidates = Array.isArray(
            propertiesWithAlternates.alternate_names,
          )
            ? propertiesWithAlternates.alternate_names
                .filter(
                  (entry): entry is string =>
                    typeof entry === 'string' && entry.trim().length > 0,
                )
                .map((entry) => stripOptionalPrefixes(normalizeString(entry)))
            : []
          const candidateValues = [
            ...exactPrimaryCandidates,
            ...exactAlternateCandidates,
          ]
          const exactStrength = exactPrimaryCandidates.includes(sanitizedSearch)
            ? 2
            : exactAlternateCandidates.includes(sanitizedSearch)
              ? 1
              : 0
          const hasExactCandidate = exactStrength > 0
          const hasNearCandidate =
            forgivingMatching &&
            sanitizedSearch.length >= 5 &&
            (result.score ?? 1) <= 0.08 &&
            candidateValues.some(
              (candidate) => Math.abs(candidate.length - sanitizedSearch.length) <= 3,
            )

          if (
            (strictMatching && hasExactCandidate) ||
            (!strictMatching &&
              (hasExactCandidate ||
                (result.matches &&
                  result.matches.length > 0 &&
                  (result.matches.some(
                    (match) => {
                      const [firstStart] = match.indices[0]
                      const lastIndex = match.indices[match.indices.length - 1][1]
                      const isPrefixMatch = firstStart === 0
                      const coversWholeValue =
                        match.value!.length - lastIndex < 2 &&
                        Math.abs(match.value!.length - sanitizedSearch.length) < 4
                      const coversSearchLength =
                        isNonLatinSearch && lastIndex - firstStart + 1 >= sanitizedSearch.length

                      return isPrefixMatch && (coversWholeValue || coversSearchLength)
                    },
                  ) ||
                    hasNearCandidate))))
          ) {
            const line = result.item.properties?.line
            const stationName =
              typeof result.item.properties?.name === 'string'
                ? result.item.properties.name.trim()
                : ''
            const isBlockedLirrForestKewCrossMatch =
              CITY_NAME === 'nyc' &&
              (sanitizedSearch === 'forest hills' || sanitizedSearch === 'kew gardens') &&
              (line === 'NewYorkSubwayE' ||
                line === 'NewYorkSubwayF' ||
                line === 'NewYorkSubwayFX') &&
              ((sanitizedSearch === 'forest hills' &&
                /^forest hills - 71 av$/i.test(stationName)) ||
                (sanitizedSearch === 'kew gardens' &&
                  /^kew gardens - union tpke$/i.test(stationName)))
            const isBlockedEwrTerminalCrossMatch =
              Boolean(nyTerminalNumber) &&
              line === 'AirTrainEWR' &&
              /^terminal [abc]$/i.test(stationName)
            if (isBlockedLirrForestKewCrossMatch || isBlockedEwrTerminalCrossMatch) {
              continue
            }

            const id = Number(result.item.id)
            if (Number.isFinite(id) && !candidateIdSet.has(id)) {
              hasCandidate = true
              candidateMatches.push({ id, exactStrength })
              candidateIdSet.add(id)
            }
          }
        }

        const strongestExactStrength = candidateMatches.reduce(
          (max, candidate) => Math.max(max, candidate.exactStrength),
          0,
        )
        const candidateSet = new Set<number>(
          candidateMatches
            .filter((candidate) =>
              strongestExactStrength > 0
                ? candidate.exactStrength > 0
                : true,
            )
            .map((candidate) => candidate.id),
        )

        const expandedSet = new Set<number>()
        candidateSet.forEach((id) => {
          expandedSet.add(id)
          const feature = idMap.get(id)
          if (!feature) {
            return
          }

          const propertiesWithCluster = feature.properties as typeof feature.properties & {
            cluster_key?: number | string
          }
          const clusterKey = propertiesWithCluster?.cluster_key
          if (clusterKey !== undefined && clusterKey !== null) {
            const clusterMembers = clusterGroups.get(Number(clusterKey))
            if (clusterMembers && clusterMembers.length > 0) {
              clusterMembers.forEach((memberId) => expandedSet.add(memberId))
            }
          }
        })

        const finalMatches: number[] = []
        let someAlreadyFound = false

        expandedSet.forEach((id) => {
          if (foundSet.has(id)) {
            someAlreadyFound = true
          } else {
            finalMatches.push(id)
          }
        })

        if (finalMatches.length === 0) {
          if (mode === 'auto') {
            return
          }
          if (someAlreadyFound || hasCandidate) {
            setAlreadyFound(true)
            setTimeout(() => setAlreadyFound(false), 1200)
            setSuggestions([])
            pushGuessHistory({
              value,
              type: 'already',
              stationNames: [],
            })
            onGuessResult?.({
              type: 'already',
              rawInput: value,
              normalizedInput: sanitizedSearch,
              suggestions: [],
            })
          } else {
            setSuggestions(suggestionNames)
            pushGuessHistory({
              value,
              type: 'wrong',
              stationNames: [],
            })
            appendMissedGuess({
              city: CITY_NAME,
              rawInput: value,
              normalizedInput: sanitizedSearch,
              suggestions: suggestionNames,
            })
            triggerWrong()
            onGuessResult?.({
              type: 'wrong',
              rawInput: value,
              normalizedInput: sanitizedSearch,
              suggestions: suggestionNames,
            })
          }
          return
        }

        setSuggestions([])
        triggerSuccess()
        if (map && (map as any).style) {
          const hoveredSource = map.getSource('hovered') as
            | mapboxgl.GeoJSONSource
            | undefined

          if (hoveredSource) {
            hoveredSource.setData({
              type: 'FeatureCollection',
              features: Array.from(expandedSet)
                .map((id) => idMap.get(id))
                .filter((feature): feature is DataFeature => Boolean(feature)),
            })

            setTimeout(() => {
              if (!map || !(map as any).style) {
                return
              }

              const resetSource = map.getSource('hovered') as
                | mapboxgl.GeoJSONSource
                | undefined

              resetSource?.setData({
                type: 'FeatureCollection',
                features: [],
              })
            }, 1500)
          }
        }

        const nextFound = Array.from(new Set([...foundSet, ...finalMatches]))
        const stationNames = Array.from(
          new Set(
            finalMatches
              .map((id) => idMap.get(id)?.properties?.name)
              .filter((name): name is string => typeof name === 'string' && name.trim().length > 0),
          ),
        )
        setFound(nextFound)
        setFoundTimestamps((prev) => {
          const next = { ...prev }
          const timestamp = new Date().toISOString()
          for (const id of finalMatches) {
            const key = String(id)
            if (!next[key]) {
              next[key] = timestamp
            }
          }
          return next
        })
        setIsNewPlayer(false)
        pushHistory(value)
        pushGuessHistory({
          value,
          type: 'correct',
          stationNames,
        })
        setSearch('')
        lastSearchRef.current = ''
        pushEvent(finalMatches)
        onGuessResult?.({
          type: 'correct',
          addedIds: finalMatches,
          rawInput: value,
          normalizedInput: sanitizedSearch,
          suggestions: [],
        })
      } catch (error) {
        if (mode === 'auto') {
          return
        }
        console.error(error)
        triggerWrong()
        pushGuessHistory({
          value,
          type: 'wrong',
          stationNames: [],
        })
        onGuessResult?.({ type: 'wrong', rawInput: value, suggestions: [] })
      }
    },
    [
      disabled,
      fuse,
      found,
      setFound,
      setFoundTimestamps,
      setWrong,
      setIsNewPlayer,
      map,
      idMap,
      clusterGroups,
      strictMatching,
      forgivingMatching,
      normalizeString,
      pushEvent,
      stripOptionalPrefixes,
      pushHistory,
      pushGuessHistory,
      onGuessResult,
    ],
  )

  const maybeAutoSubmit = useCallback(
    (value: string, isComposing: boolean) => {
      if (!autoSubmitOnMatch) {
        return false
      }

      const shouldAutoSubmit = shouldAutoSubmitStationInput({
        features: idMap.values(),
        rawInput: value,
        normalizeValue: normalizeString,
        stripOptionalPrefixes,
        isComposing,
      })
      if (!shouldAutoSubmit) {
        return false
      }

      submitGuess(value, 'auto')
      return true
    },
    [autoSubmitOnMatch, idMap, normalizeString, stripOptionalPrefixes, submitGuess],
  )

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (disabled) {
        return
      }

      if (e.key === 'Enter' && Date.now() < suppressEnterUntilRef.current) {
        e.preventDefault()
        return
      }

      if ((e.key === 'Backspace' || e.key === 'Delete') && search.length > 0) {
        onInputEdit?.(e.key === 'Backspace' ? 'backspace' : 'delete')
      }

      if (e.key === 'ArrowUp') {
        if (history.length === 0) {
          return
        }

        e.preventDefault()
        setHistoryIndex((prev) => {
          const nextIndex =
            prev === null ? history.length - 1 : Math.max(prev - 1, 0)
          const nextValue = history[nextIndex]
          setSearch(nextValue)
          lastSearchRef.current = nextValue
          return nextIndex
        })
        return
      }

      if (e.key === 'ArrowDown') {
        if (history.length === 0) {
          return
        }

        e.preventDefault()
        setHistoryIndex((prev) => {
          if (prev === null) {
            return null
          }

          if (prev === history.length - 1) {
            setSearch('')
            lastSearchRef.current = ''
            return null
          }

          const nextIndex = Math.min(prev + 1, history.length - 1)
          const nextValue = history[nextIndex]
          setSearch(nextValue)
          lastSearchRef.current = nextValue
          return nextIndex
        })
        return
      }

      if (e.key !== 'Enter') return
      if (
        isComposingRef.current ||
        e.nativeEvent.isComposing ||
        (e.nativeEvent as KeyboardEvent & { keyCode?: number }).keyCode === 229
      ) {
        submitAfterCompositionRef.current = true
        e.preventDefault()
        return
      }
      if (!search) return

      e.preventDefault()
      submitGuess(search, 'manual')
    },
    [disabled, history, onInputEdit, search, submitGuess],
  )

  const handleCompositionStart: CompositionEventHandler<HTMLInputElement> =
    useCallback(() => {
      isComposingRef.current = true
    }, [])

  const handleCompositionEnd: CompositionEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      isComposingRef.current = false
      const shouldSubmitAfterComposition = submitAfterCompositionRef.current
      submitAfterCompositionRef.current = false

      const value = event.currentTarget.value
      if (!value.trim()) {
        return
      }

      if (shouldSubmitAfterComposition) {
        suppressEnterUntilRef.current = Date.now() + 100
        window.setTimeout(() => {
          submitGuess(value, 'manual')
        }, 0)
        return
      }

      maybeAutoSubmit(value, false)
    },
    [maybeAutoSubmit, submitGuess],
  )

  return (
    <div className="relative grow min-w-0">
      <input
        className={classNames(
          {
            'animate-shake': wrong,
            'shadow-md !shadow-emerald-400': success,
            'border-emerald-300 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-300/70 shadow-emerald-500/30':
              success,
            'dark:border-emerald-500/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-500/40':
              success,
            'border-red-300 bg-red-50/80 text-red-900 ring-2 ring-red-300/70 shadow-red-500/30': wrong,
            'dark:border-red-500/70 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-500/40':
              wrong,
          },
          'relative z-40 w-full rounded-full border border-zinc-200 bg-white py-2 pl-4 pr-12 text-lg font-bold text-zinc-900 caret-current shadow-lg outline-none ring-zinc-800 transition-shadow duration-300 focus:ring-2 placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-[#18181b] dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500',
        )}
        style={wrong ? { animation: 'shake 0.5s ease-in-out', animationIterationCount: 2 } : undefined}
        ref={inputRef}
        placeholder={t('inputPlaceholder')}
        value={search}
        onChange={(e) => {
          const value = (e.target as HTMLInputElement).value
          if (value === '' && lastSearchRef.current.trim().length > 0) {
            pushHistory(lastSearchRef.current)
          }
          setHistoryIndex(null)
          setSearch(value)
          if (suggestions.length > 0) {
            setSuggestions([])
          }
          lastSearchRef.current = value
          maybeAutoSubmit(
            value,
            Boolean((e.nativeEvent as Event & { isComposing?: boolean }).isComposing) ||
              isComposingRef.current,
          )
        }}
        id="input"
        type="text"
        autoFocus={autoFocus && !disabled}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={onKeyDown}
        disabled={disabled}
      ></input>
      <button
        type="button"
        aria-label="Show guess history"
        title="Show guess history"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setHistoryPanelOpen((prev) => !prev)
          setSuggestions([])
        }}
        className="absolute right-2 top-1/2 z-50 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MdHistory className="h-5 w-5" aria-hidden="true" />
      </button>
      {historyPanelOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-black text-zinc-950 dark:text-zinc-50">
              Guess history
            </p>
            <button
              type="button"
              onClick={() => setHistoryPanelOpen(false)}
              aria-label="Close guess history"
              title="Close guess history"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <MdClose className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            {guessHistory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                No submitted guesses yet.
              </p>
            ) : (
              <div className="space-y-2">
                {guessHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-bold text-zinc-950 dark:text-zinc-50">
                        {entry.value}
                      </p>
                      <span
                        className={classNames(
                          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black tracking-wide',
                          entry.type === 'correct'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : entry.type === 'already'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                        )}
                      >
                        {guessHistoryIcons[entry.type]} {guessHistoryLabels[entry.type]}
                      </span>
                    </div>
                    {entry.stationNames.length > 0 && (
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {entry.stationNames.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="absolute left-2 right-2 top-full z-40 mt-2 rounded-2xl border border-zinc-200 bg-white/95 p-3 text-sm shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Did you mean?
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => submitGuess(suggestion, 'manual')}
                className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-bold text-zinc-800 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      <Transition
        show={alreadyFound}
        as="div"
        className="pointer-events-none absolute right-10 top-0 z-50 my-auto mt-1 flex h-auto items-center"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-500"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="my-1 mr-2 flex items-center justify-center rounded-full border-green-400 bg-green-200 px-2 py-1 text-sm font-bold text-green-800">
          {t('alreadyFound')}
        </div>
      </Transition>
    </div>
  )
}

export default Input
