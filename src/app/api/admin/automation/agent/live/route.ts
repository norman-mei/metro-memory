import { isAutomationAdminAuthenticated } from '@/lib/adminAuth'
import {
  getAutomationAgentGraphAnalytics,
  getAutomationAgentSessionGraph,
} from '@/lib/automationRunRequests'
import { prisma } from '@/lib/prisma'

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(request: Request) {
  if (!(await isAutomationAdminAuthenticated())) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId') || ''

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const sendSnapshot = async () => {
        const session = sessionId ? await getAutomationAgentSessionGraph(sessionId) : null
        const relevantCities = session
          ? Array.from(
              new Set(
                session.runRequests.flatMap((request) =>
                  Array.isArray(request.citySlugsJson)
                    ? request.citySlugsJson.map((value) => String(value)).filter(Boolean)
                    : [],
                ),
              ),
            )
          : []
        const [pendingResearchCount, runningResearchCount, graphAnalytics, recentEvents] = await Promise.all([
          prisma.automationResearchRun.count({
            where: {
              status: 'PENDING',
              ...(relevantCities.length > 0 ? { citySlug: { in: relevantCities } } : {}),
            },
          }),
          prisma.automationResearchRun.count({
            where: {
              status: 'RUNNING',
              ...(relevantCities.length > 0 ? { citySlug: { in: relevantCities } } : {}),
            },
          }),
          getAutomationAgentGraphAnalytics(6),
          prisma.automationAgentEvent.findMany({
            where: {
              ...(sessionId ? { sessionId } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          }),
        ])

        controller.enqueue(
          encoder.encode(
            encodeEvent('snapshot', {
              session,
              liveState: {
                pendingResearchCount,
                runningResearchCount,
                graphAnalytics,
                recentEvents,
              },
            }),
          ),
        )
      }

      await sendSnapshot()
      const interval = setInterval(() => {
        void sendSnapshot()
      }, 4000)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
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
