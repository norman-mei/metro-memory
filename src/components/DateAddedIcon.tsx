import { SVGProps } from 'react'

export function DateAddedIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M17 22v-3h-3v-2h3v-3h2v3h3v2h-3v3h-2ZM5 20q-.825 0-1.413-.588T3 18V6q0-.825.588-1.413T5 4h1V2h2v2h6V2h2v2h1q.825 0 1.413.588T19 6v6.1q-.5-.075-1-.075t-1 .075V10H5v8h7q0 .5.075 1t.275 1H5Z"
      ></path>
    </svg>
  )
}
