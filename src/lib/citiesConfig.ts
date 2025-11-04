import paris from '@/app/(game)/paris/opengraph-image.jpg'
import london from '@/app/(game)/london/opengraph-image.jpg'
import berlin from '@/app/(game)/berlin/opengraph-image.jpg'
import ny from '@/app/(game)/ny/opengraph-image.jpg'
import wien from '@/app/(game)/wien/opengraph-image.jpg'
import dc from '@/app/(game)/dc/opengraph-image.jpg'
import madrid from '@/app/(game)/madrid/opengraph-image.jpg'
import seoul from '@/app/(game)/seoul/opengraph-image.jpg'
import barcelona from '@/app/(game)/barcelona/opengraph-image.jpg'
import mexicoCity from '@/app/(game)/mexico-city/opengraph-image.jpg'
import istanbul from '@/app/(game)/istanbul/opengraph-image.jpg'
import tokyo from '@/app/(game)/tokyo/opengraph-image.jpg'
import stockholm from '@/app/(game)/stockholm/opengraph-image.jpg'
import singapore from '@/app/(game)/singapore/opengraph-image.jpg'
import montreal from '@/app/(game)/montreal/opengraph-image.jpg'
import chicago from '@/app/(game)/chicago/opengraph-image.jpg'
import boston from '@/app/(game)/boston/opengraph-image.jpg'
import hamburg from '@/app/(game)/hamburg/opengraph-image.jpg'
import muenchen from '@/app/(game)/muenchen/opengraph-image.jpg'
import potsdam from '@/app/(game)/potsdam/opengraph-image.jpg'
import karlsruhe from '@/app/(game)/karlsruhe/opengraph-image.jpg'
import dresden from '@/app/(game)/dresden/opengraph-image.jpg'
import budapest from '@/app/(game)/budapest/opengraph-image.jpg'
import philly from '@/app/(game)/philly/opengraph-image.png'


import { StaticImageData } from 'next/image'

export interface ICity {
  name: string
  image: StaticImageData
  link: string
  continent: string
  disabled?: boolean
  hideInStats?: boolean
}

export const cities: ICity[] = [
  {
    name: 'Paris',
    image: paris,
    link: 'https://memory.pour.paris',
    continent: 'Europe',
  },
  {
    name: 'London',
    image: london,
    link: '/london',
    continent: 'Europe',
  },
  {
    name: 'Berlin',
    image: berlin,
    link: '/berlin',
    continent: 'Europe',
  },
  {
    name: 'Vienna',
    image: wien,
    link: '/wien',
    continent: 'Europe',
  },
  {
    name: 'Washington DC',
    image: dc,
    link: '/dc',
    continent: 'North America',
  },
  {
    name: 'Philadelphia',
    image: philly,
    link: '/philly',
    continent: 'North America',
  },
  {
    name: 'Madrid',
    image: madrid,
    link: '/madrid',
    continent: 'Europe',
  },
  {
    name: 'Barcelona',
    image: barcelona,
    link: '/barcelona',
    continent: 'Europe',
  },
  {
    name: 'Seoul',
    image: seoul,
    link: '/seoul',
    continent: 'Asia',
  },
  {
    name: 'Mexico City',
    image: mexicoCity,
    link: '/mexico-city',
    continent: 'North America',
  },
  {
    name: 'New York',
    image: ny,
    link: '/ny',
    continent: 'North America',
  },
  {
    name: 'Istanbul',
    image: istanbul,
    link: '/istanbul',
    continent: 'Europe',
  },
  {
    name: 'Tokyo',
    image: tokyo,
    link: '/tokyo',
    continent: 'Asia',
  },
  {
    name: 'Stockholm',
    image: stockholm,
    link: '/stockholm',
    continent: 'Europe',
  },
  {
    name: 'Singapore',
    image: singapore,
    link: '/singapore',
    continent: 'Asia',
  },
  {
    name: 'Montréal',
    image: montreal,
    link: '/montreal',
    continent: 'North America',
  },
  {
    name: 'Chicago',
    image: chicago,
    link: '/chicago',
    continent: 'North America',
  },
  {
    name: 'Boston',
    image: boston,
    link: '/boston',
    continent: 'North America',
  },
  {
    name: 'Hamburg',
    image: hamburg,
    link: '/hamburg',
    continent: 'Europe',
  },
  {
    name: 'München',
    image: muenchen,
    link: '/muenchen',
    continent: 'Europe',
  },
  {
    name: 'Potsdam',
    image: potsdam,
    link: '/potsdam',
    continent: 'Europe',
  },
  {
    name: 'Karlsruhe',
    image: karlsruhe,
    link: '/karlsruhe',
    continent: 'Europe',
  },
  {
    name: 'Dresden',
    image: dresden,
    link: '/dresden',
    continent: 'Europe',
  },
  {
    name: 'Budapest',
    image: budapest,
    link: '/budapest',
    continent: 'Europe',
  },
  // {
  //   name: 'Vancouver',
  //   image: vancouver,
  //   link: '/vancouver',
  // },
]
