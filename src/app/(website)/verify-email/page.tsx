import VerifyEmailClient from '@/app/(website)/verify-email/view'

export const metadata = {
  title: 'Verify email | Metro Memory',
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <VerifyEmailClient />
    </div>
  )
}
