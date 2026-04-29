import Tweet from './Tweet'

const quotes = [
  '1716359058704187729',
  '1716310657467822513',
  '1716241950238502947',
  '1716222381012734132',
  '1716116098611831182',
  '1718583959322259844',
  '1707956594829304284',
]

const Tweets = () => {
  return (
    <div className="mt-6">
      <div className="columns-2xs break-inside-avoid gap-4">
        {quotes.map((id) => (
          <Tweet key={id} id={id} />
        ))}
      </div>
    </div>
  )
}

export default Tweets
