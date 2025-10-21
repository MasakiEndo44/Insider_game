/**
 * HTTP Response Helpers for Edge Functions
 *
 * Error Handling Pattern:
 * - Never throw raw errors (causes 500 with no body)
 * - Always return `err()` for controlled error responses
 * - Use standard HTTP status codes
 */

interface SuccessResponse<T = unknown> {
  data: T
}

interface ErrorResponse {
  error: {
    code: string
    message: string
  }
}

/**
 * Success response helper
 *
 * @example
 * return ok({ userId: '123' }, 201)
 */
export function ok<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify({ data } as SuccessResponse<T>),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Error response helper
 *
 * @example
 * return err('Invalid session', 404, 'SESSION_NOT_FOUND')
 */
export function err(
  message: string,
  status = 400,
  code = 'BAD_REQUEST'
): Response {
  return new Response(
    JSON.stringify({
      error: { code, message },
    } as ErrorResponse),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * CORS headers for Edge Functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}
