import { Suspense } from 'react'
import { getTweet } from 'react-tweet/api'
import { type TweetProps, TweetNotFound, TweetSkeleton } from 'react-tweet'

import type { Tweet as TweetType } from 'react-tweet/api'

import {
  type TwitterComponents,
  TweetHeader,
  TweetInReplyTo,
  TweetBody,
  TweetInfo,
  enrichTweet,
} from 'react-tweet'

type Props = {
  tweet: TweetType
  components?: TwitterComponents
}

export const MyTweet = ({ tweet: t, components }: Props) => {
  const tweet = enrichTweet(t)
  return (
    <figure className="mb-4 break-inside-avoid rounded-2xl border px-4 py-6">
      <TweetHeader tweet={tweet} components={components} />
      {tweet.in_reply_to_status_id_str && <TweetInReplyTo tweet={tweet} />}
      <TweetBody tweet={tweet} />
      <hr className="my-3" />
      <TweetInfo tweet={tweet} />
    </figure>
  )
}

const TweetContent = async ({ id, components, onError }: TweetProps) => {
  const tweet = id
    ? await getTweet(id).catch((err) => {
        if (onError) {
          onError(err)
        } else {
          console.error(err)
        }
      })
    : undefined

  if (!tweet) {
    const NotFound = components?.TweetNotFound || TweetNotFound
    return <NotFound />
  }

  return <MyTweet tweet={tweet} components={components} />
}

export const Tweet = ({
  fallback = <TweetSkeleton />,
  ...props
}: TweetProps) => (
  <Suspense fallback={fallback}>
    <TweetContent {...props} />
  </Suspense>
)

export default Tweet
