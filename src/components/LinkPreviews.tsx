import LinkPreview from './LinkPreview'

const urls = [
  'https://www.theguardian.com/travel/2023/oct/31/metro-memory-and-tim-marshall-put-cartography-back-on-the-map',
  'https://www.numerama.com/vroom/1518632-votre-mission-si-vous-lacceptez-retrouver-les-309-stations-de-metro-de-paris.html',
  'https://www.thetimes.co.uk/article/london-underground-map-game-tube-quiz-qqqgpmkps',
  'https://www.bbc.com/news/uk-england-london-67197933',
  'https://www.timeout.fr/paris/actualites/ce-jeu-vous-defie-de-retrouver-le-maximum-de-stations-de-metro-de-tete-100923',
  'https://parissecret.com/jeu-stations-metro/',
  'https://www.sopitas.com/noticias/metro-memory-juego-nombres-estaciones-metro-cdmx/',
]

const Tweets = () => {
  return (
    <div className="mt-6">
      <div className="columns-xs break-inside-avoid gap-4">
        {urls.map((url) => (
          <LinkPreview key={url} url={url} />
        ))}
      </div>
    </div>
  )
}

export default Tweets
