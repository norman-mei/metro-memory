import { ICity } from './citiesConfig'

const slugify = (city: ICity) => {
  return city.link === 'https://memory.pour.paris' // only city hosted elsewhere
    ? 'paris'
    : city.link.replace('/', '')
}

export default slugify
