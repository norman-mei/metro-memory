import ResetPasswordClient from '@/app/(website)/reset-password/view'

export const metadata = {
  title: 'Reset password | Metro Memory',
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <ResetPasswordClient />
    </div>
  )
}
