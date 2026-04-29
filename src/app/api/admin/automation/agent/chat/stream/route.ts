import { getAutomationReviewerLabel, isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import { processAutomationAgentChat } from '@/lib/automationAgentChat'

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const reviewer = await getAutomationReviewerLabel()

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(encodeEvent('status', { state: 'thinking' })))
      try {
        const result = await processAutomationAgentChat({
          reviewer,
          sessionId: typeof payload?.sessionId === 'string' ? payload.sessionId : undefined,
          branchId: typeof payload?.branchId === 'string' ? payload.branchId : undefined,
          parentMessageId:
            typeof payload?.parentMessageId === 'string' ? payload.parentMessageId : undefined,
          editMessageId:
            typeof payload?.editMessageId === 'string' ? payload.editMessageId : undefined,
          regenerateMessageId:
            typeof payload?.regenerateMessageId === 'string'
              ? payload.regenerateMessageId
              : undefined,
          message: typeof payload?.message === 'string' ? payload.message : '',
        })

        controller.enqueue(
          encoder.encode(
            encodeEvent('meta', {
              sessionId: result.sessionId,
              branchId: result.branchId,
              runRequestId: result.runRequestId,
              actionRequestId: result.actionRequestId,
              assistantMessageId: result.assistantMessageId,
            }),
          ),
        )

        const chunks = result.assistantMessage.match(/.{1,80}(\s|$)/g) || [result.assistantMessage]
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(encodeEvent('assistant_delta', { text: chunk })))
        }
        controller.enqueue(
          encoder.encode(
            encodeEvent('done', {
              sessionId: result.sessionId,
              branchId: result.branchId,
              assistantMessage: result.assistantMessage,
              runRequestId: result.runRequestId,
            }),
          ),
        )
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            encodeEvent('error', {
              error:
                error instanceof Error
                  ? error.message
                  : 'Automation agent request failed.',
            }),
          ),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
