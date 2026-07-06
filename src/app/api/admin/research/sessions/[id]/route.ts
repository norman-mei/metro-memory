import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import {
  deleteSession,
  getSessionWithMessages,
  renameSession,
  setSessionArchived,
} from '@/lib/research/sessions'

async function guard() {
  if (!(await isAutomationAdminAuthenticated())) return null
  return getAutomationReviewerLabel()
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const reviewer = await guard()
  if (!reviewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const session = await getSessionWithMessages(id, reviewer)
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ session })
}

const patchSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    archived: z.boolean().optional(),
  })
  .refine((v) => v.title !== undefined || v.archived !== undefined, {
    message: 'Nothing to update.',
  })

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const reviewer = await guard()
  if (!reviewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = patchSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
  const { id } = await ctx.params

  if (parsed.data.archived !== undefined) {
    const ok = await setSessionArchived(id, reviewer, parsed.data.archived)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (parsed.data.title !== undefined) {
    const ok = await renameSession(id, reviewer, parsed.data.title)
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const reviewer = await guard()
  if (!reviewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const ok = await deleteSession(id, reviewer)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
