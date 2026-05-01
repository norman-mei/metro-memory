import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const SESSION_COOKIE_NAME = 'mm_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const SESSION_TTL_REMEMBER_MS = 1000 * 60 * 60 * 24 * 30 // 30 days
const VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60 // 1 hour

const currentUserSelect = {
  id: true,
  email: true,
  pendingEmail: true,
  passwordHash: true,
  emailVerifiedAt: true,
  adFree: true,
  uiPreferences: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

type CurrentUserRecord = Prisma.UserGetPayload<{
  select: typeof currentUserSelect
}>

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

async function getCookieStore() {
  return cookies()
}

function buildCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  }
}

export async function createSession(userId: string, rememberMe = false) {
  const rawToken = randomBytes(48).toString('hex')
  const tokenHash = hashValue(rawToken)
  const ttl = rememberMe ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_MS
  const expiresAt = new Date(Date.now() + ttl)

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  const store = await getCookieStore()
  store.set(SESSION_COOKIE_NAME, rawToken, buildCookieOptions(expiresAt))
}

export async function clearSessionCookie() {
  const store = await getCookieStore()
  const existing = store.get(SESSION_COOKIE_NAME)?.value
  if (existing) {
    const tokenHash = hashValue(existing)
    await prisma.session.deleteMany({
      where: { tokenHash },
    })
  }
  store.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  })
}

export async function getCurrentUser() {
  const store = await getCookieStore()
  const token = store.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return null
  }

  const tokenHash = hashValue(token)
  const session = await prisma.session.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      user: {
        select: currentUserSelect,
      },
    },
  })

  if (!session) {
    store.delete(SESSION_COOKIE_NAME)
    return null
  }

  return {
    ...session.user,
  } satisfies CurrentUserRecord
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function createVerificationToken(userId: string) {
  const rawToken = randomBytes(48).toString('hex')
  const tokenHash = hashValue(rawToken)
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS)

  const token = await prisma.verificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      type: 'EMAIL',
    },
  })

  return { token: rawToken, record: token }
}

export async function clearVerificationTokensForUser(userId: string) {
  await prisma.verificationToken.deleteMany({
    where: {
      userId,
      type: 'EMAIL',
    },
  })
}

export async function createPasswordResetToken(userId: string) {
  const rawToken = randomBytes(48).toString('hex')
  const tokenHash = hashValue(rawToken)
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)

  const token = await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  return { token: rawToken, record: token }
}

export async function clearPasswordResetTokensForUser(userId: string) {
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
    },
  })
}
