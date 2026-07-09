import { currentUserRow, type AuthEnv } from '../auth/session'
import { getBinder } from './store'

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' }
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })

export async function onBinder(request: Request, env: AuthEnv): Promise<Response> {
  if (request.method.toUpperCase() !== 'GET')
    return json({ error: 'method not allowed' }, 405)
  if (!env.STATS_DB) return json({ error: 'accounts unavailable' }, 503)

  const user = await currentUserRow(env, request)
  if (!user) return json({ error: 'not signed in' }, 401)

  const binder = await getBinder(env.STATS_DB, user.id)
  return json({ binder })
}
