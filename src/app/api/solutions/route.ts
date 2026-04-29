import { NextResponse } from 'next/server'

const SOLUTIONS_PASSWORD = process.env.SOLUTIONS_PASSWORD

export const POST = async (req: Request) => {
  if (!SOLUTIONS_PASSWORD) {
    console.warn(
      'SOLUTIONS_PASSWORD is not configured. Rejecting solutions unlock request.',
    )
    return NextResponse.json(
      { success: false, error: 'Not configured' },
      { status: 500 },
    )
  }

  try {
    const { password } = (await req.json()) as { password?: string }
    const isValid =
      typeof password === 'string' &&
      password.trim().length > 0 &&
      password.trim() === SOLUTIONS_PASSWORD

    if (!isValid) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to validate solutions password:', error)
    return NextResponse.json({ success: false }, { status: 400 })
  }
}
