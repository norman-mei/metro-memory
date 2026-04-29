import { SVGProps } from 'react'

export function MinimizeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="m12 10.775l-3.9 3.9q-.275.275-.7.275t-.7-.275q-.275-.275-.275-.7t.275-.7l4.6-4.6q.15-.15.325-.213T12 8.4q.2 0 .375.063t.325.212l4.6 4.6q.275.275.275.7t-.275.7q-.275.275-.7.275t-.7-.275l-3.9-3.9Z"
      ></path>
    </svg>
  )
}
