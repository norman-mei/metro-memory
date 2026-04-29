import { NextResponse } from 'next/server'

type SerializedAuthError = {
  name?: string
  message: string
  code?: string
  errno?: number
  meta?: unknown
  cause?: string
}

type AuthErrorResponseOptions = {
  request: Request
  route: string
  stage: string
  error: unknown
  message: string
  status?: number
  debugId?: string
  metadata?: Record<string, unknown>
}

export function buildAuthDebugId(route: string) {
  return `${route.replaceAll('/', '-')}-${Date.now().toString(36)}`
}

export function isAuthBrowserDebugEnabled(request: Request) {
  return (
    process.env.NODE_ENV !== 'production' &&
    request.headers.get('x-metro-debug-auth') === '1'
  )
}

export function serializeAuthError(error: unknown): SerializedAuthError {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
    }
  }

  const maybeError = error as Error & {
    code?: string
    errno?: number
    meta?: unknown
    cause?: unknown
  }

  return {
    name: maybeError.name,
    message: maybeError.message,
    ...(maybeError.code ? { code: maybeError.code } : {}),
    ...(typeof maybeError.errno === 'number' ? { errno: maybeError.errno } : {}),
    ...(maybeError.meta ? { meta: maybeError.meta } : {}),
    ...(maybeError.cause ? { cause: String(maybeError.cause) } : {}),
  }
}

export function logAuthRouteError(
  route: string,
  debugId: string,
  stage: string,
  error: unknown,
  metadata: Record<string, unknown> = {},
) {
  console.error(`[MetroMemory auth] ${route} failure`, {
    debugId,
    stage,
    ...metadata,
    error: serializeAuthError(error),
  })
}

export function buildAuthErrorResponse({
  request,
  route,
  stage,
  error,
  message,
  status = 500,
  debugId = buildAuthDebugId(route),
  metadata = {},
}: AuthErrorResponseOptions) {
  logAuthRouteError(route, debugId, stage, error, metadata)

  const payload: Record<string, unknown> = {
    error: message,
    debugId,
  }

  if (isAuthBrowserDebugEnabled(request)) {
    payload.debug = {
      stage,
      details: serializeAuthError(error),
      metadata,
    }
  }

  return NextResponse.json(payload, { status })
}
