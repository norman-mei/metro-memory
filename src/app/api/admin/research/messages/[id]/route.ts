import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { editAndRegenerate } from '@/lib/research/chat'
import { deleteMessage } from '@/lib/research/sessions'

export const maxDuration = 300

const editSchema = z.object({ content: z.string().min(1).max(2000) })

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const parsed = editSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })

  const reviewer = await getAutomationReviewerLabel()
  const { id } = await ctx.params
  const result = await editAndRegenerate({ messageId: id, content: parsed.data.content, reviewer })
  if (!result) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  return NextResponse.json(result)
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAutomationAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const reviewer = await getAutomationReviewerLabel()
  const { id } = await ctx.params
  const ok = await deleteMessage(id, reviewer)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
