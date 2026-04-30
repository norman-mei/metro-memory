'use client'

import classNames from 'classnames'
import { ComponentPropsWithoutRef } from 'react'
import { MdClose } from 'react-icons/md'

type CloseButtonProps = {
  ariaLabel: string
  title?: string
  iconClassName?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'aria-label' | 'title'>

export default function CloseButton({
  ariaLabel,
  title,
  className,
  iconClassName,
  type = 'button',
  ...props
}: CloseButtonProps) {
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={classNames(
        'inline-flex items-center justify-center rounded-full transition focus:outline-none focus:ring-2',
        className,
      )}
      {...props}
    >
      <MdClose
        className={classNames('h-5 w-5 shrink-0', iconClassName)}
        aria-hidden="true"
      />
    </button>
  )
}
