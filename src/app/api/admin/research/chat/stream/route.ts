import { z } from 'zod'

import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { streamChatTurn } from '@/lib/research/chat'

export const maxDuration = 300

const schema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().nullish(),
})

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid chat payload.' }), { status: 400 })
  }

  const reviewer = await getAutomationReviewerLabel()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      try {
        const result = await streamChatTurn(
          { message: parsed.data.message, sessionId: parsed.data.sessionId ?? null, reviewer },
          (delta) => send({ type: 'delta', delta }),
        )
        send({ type: 'done', sessionId: result.sessionId, runId: result.runId })
      } catch (error) {
        send({ type: 'error', error: error instanceof Error ? error.message : 'Chat failed.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
