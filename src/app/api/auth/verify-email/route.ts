import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { clearVerificationTokensForUser, hashValue, normalizeEmail } from '@/lib/auth'
import { buildAuthDebugId, logAuthRouteError } from '@/lib/authRouteSupport'

function buildRedirect(requestUrl: string, status: 'success' | 'error') {
  const url = new URL(requestUrl)
  url.pathname = '/'
  url.search = ''
  url.searchParams.set('tab', 'account')
  url.searchParams.set('verified', status)
  url.hash = ''
  return NextResponse.redirect(url, { status: status === 'success' ? 302 : 303 })
}

export async function GET(request: Request) {
  let debugStage = 'parse-request'
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const newEmailParam = url.searchParams.get('newEmail')

    if (!token) {
      return buildRedirect(request.url, 'error')
    }

    if (newEmailParam) {
      debugStage = 'normalize-email'
      const normalizedEmail = normalizeEmail(newEmailParam)

      debugStage = 'find-email-change-token'
      const tokenHash = hashValue(`${token}:${normalizedEmail}`)
      const record = await prisma.verificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      })

      if (!record || record.expiresAt < new Date()) {
        if (record) {
          debugStage = 'delete-expired-email-change-token'
          await prisma.verificationToken.delete({
            where: { id: record.id },
          })
        }
        return buildRedirect(request.url, 'error')
      }

      if (!record.user.pendingEmail || record.user.pendingEmail !== normalizedEmail) {
        debugStage = 'delete-invalid-email-change-token'
        await prisma.verificationToken.delete({
          where: { id: record.id },
        })
        return buildRedirect(request.url, 'error')
      }

      debugStage = 'check-existing-email'
      const existingEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })

      if (existingEmail) {
        debugStage = 'delete-email-change-token'
        await prisma.verificationToken.delete({
          where: { id: record.id },
        })
        return buildRedirect(request.url, 'error')
      }

      debugStage = 'apply-email-change'
      await prisma.user.update({
        where: { id: record.userId },
        data: {
          email: normalizedEmail,
          pendingEmail: null,
          emailVerifiedAt: new Date(),
        },
      })

      debugStage = 'clear-verification-tokens'
      await clearVerificationTokensForUser(record.userId)

      return buildRedirect(request.url, 'success')
    }

    debugStage = 'find-verification-token'
    const tokenHash = hashValue(token)
    const record = await prisma.verificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (!record || record.expiresAt < new Date()) {
      if (record) {
        debugStage = 'delete-expired-verification-token'
        await prisma.verificationToken.delete({
          where: { id: record.id },
        })
      }
      return buildRedirect(request.url, 'error')
    }

    debugStage = 'mark-email-verified'
    await prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    })

    debugStage = 'clear-verification-tokens'
    await clearVerificationTokensForUser(record.userId)

    return buildRedirect(request.url, 'success')
  } catch (error) {
    logAuthRouteError('verify-email', buildAuthDebugId('verify-email'), debugStage, error)
    return buildRedirect(request.url, 'error')
  }
}
