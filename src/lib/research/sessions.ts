// Chat session + message management for the ChatGPT-style research console.
// Sessions are persisted in the DB (account-scoped by the admin reviewer label),
// which is the durable store; the client keeps only the active session id locally.

import { prisma } from '@/lib/prisma'

export async function listSessions(owner: string) {
  return prisma.chatSession.findMany({
    where: { createdBy: owner },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })
}

export async function getSessionWithMessages(id: string, owner: string) {
  const session = await prisma.chatSession.findFirst({
    where: { id, createdBy: owner },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  return session
}

export async function createSession(owner: string, title?: string) {
  return prisma.chatSession.create({
    data: { createdBy: owner, title: title?.slice(0, 120) ?? 'New chat' },
  })
}

export async function renameSession(id: string, owner: string, title: string) {
  const result = await prisma.chatSession.updateMany({
    where: { id, createdBy: owner },
    data: { title: title.slice(0, 120) || 'Untitled' },
  })
  return result.count > 0
}

export async function deleteSession(id: string, owner: string) {
  const result = await prisma.chatSession.deleteMany({ where: { id, createdBy: owner } })
  return result.count > 0
}

export async function deleteMessage(messageId: string, owner: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: { session: { select: { createdBy: true } } },
  })
  if (!message || message.session.createdBy !== owner) return false
  await prisma.chatMessage.delete({ where: { id: messageId } })
  await prisma.chatSession.update({
    where: { id: message.sessionId },
    data: { updatedAt: new Date() },
  })
  return true
}

/**
 * Forks a new session containing a copy of all messages up to and including
 * `uptoMessageId`, preserving order. Returns the new session id, or null if the
 * message isn't found / not owned by the caller.
 */
export async function branchSession(
  uptoMessageId: string,
  owner: string,
): Promise<string | null> {
  const pivot = await prisma.chatMessage.findUnique({
    where: { id: uptoMessageId },
    include: { session: { select: { createdBy: true, title: true } } },
  })
  if (!pivot || pivot.session.createdBy !== owner) return null

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: pivot.sessionId, createdAt: { lte: pivot.createdAt } },
    orderBy: { createdAt: 'asc' },
  })

  const branch = await prisma.chatSession.create({
    data: {
      createdBy: owner,
      title: `${pivot.session.title ?? 'Chat'} (branch)`.slice(0, 120),
      messages: {
        create: messages.map((m) => ({
          role: m.role,
          content: m.content,
          structuredJson: (m.structuredJson ?? undefined) as any,
        })),
      },
    },
  })
  return branch.id
}
