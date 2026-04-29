import classNames from 'classnames'

export default function XpProgressCard({
  eyebrow,
  title,
  description,
  valueLabel,
  progress,
  disabled = false,
}: {
  eyebrow: string
  title: string
  description: string
  valueLabel: string
  progress: number
  disabled?: boolean
}) {
  const normalizedProgress = Math.max(0, Math.min(1, progress))

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p
            className={classNames(
              'text-xs font-semibold uppercase tracking-[0.24em]',
              disabled ? 'text-zinc-400 dark:text-zinc-500' : 'text-[var(--accent-600)]',
            )}
          >
            {eyebrow}
          </p>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
        </div>
        <div
          className={classNames(
            'text-sm font-semibold',
            disabled ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-700 dark:text-zinc-200',
          )}
        >
          {valueLabel}
        </div>
      </div>

      <div
        className={classNames(
          'mt-4 h-3 w-full overflow-hidden rounded-full',
          disabled ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-zinc-100 dark:bg-zinc-800',
        )}
      >
        <div
          className={classNames(
            'h-full rounded-full transition-[width]',
            disabled ? 'bg-zinc-400/70 dark:bg-zinc-600' : 'bg-[var(--accent-600)]',
          )}
          style={{ width: `${normalizedProgress * 100}%` }}
        />
      </div>
    </article>
  )
}
