import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiFetch } from '../src/api.js'

//Day 1, Step 3: apiFetch
//Change this if you pick a different localStorage key for the token
const TOKEN_KEY = 'token'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

let fetchMock

beforeEach(() => {
  localStorage.clear()
  fetchMock = vi.fn(async () => jsonResponse({}))
  vi.stubGlobal('fetch', fetchMock)
})

//Normalizes whatever apiFetch passed (plain object or Headers) so tests don't depend on the style
function sentHeaders() {
  const [, init = {}] = fetchMock.mock.calls[0]
  return new Headers(init.headers)
}

function sentInit() {
  return fetchMock.mock.calls[0][1] ?? {}
}

describe('apiFetch request', () => {
  it('makes exactly one fetch call', async () => {
    await apiFetch('/customers')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('prefixes the path with /api', async () => {
    await apiFetch('/customers/3')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/customers/3')
  })

  it('sends a JSON Content-Type', async () => {
    await apiFetch('/customers')
    expect(sentHeaders().get('Content-Type')).toBe('application/json')
  })

  it('passes method and body through unchanged', async () => {
    const body = JSON.stringify({ username: 'admin', password: 'password' })
    await apiFetch('/login', { method: 'POST', body })
    expect(sentInit().method).toBe('POST')
    //Callers stringify; apiFetch must not stringify a second time
    expect(sentInit().body).toBe(body)
  })

  it('lets caller headers be added and override the defaults', async () => {
    await apiFetch('/customers', { headers: { 'X-Test': 'yes', 'Content-Type': 'text/plain' } })
    expect(sentHeaders().get('X-Test')).toBe('yes')
    expect(sentHeaders().get('Content-Type')).toBe('text/plain')
  })
})

describe('apiFetch Authorization header', () => {
  it('is omitted when there is no token', async () => {
    await apiFetch('/customers')
    //Catches "Bearer null" / "Bearer undefined" as well as an empty header
    expect(sentHeaders().has('Authorization')).toBe(false)
  })

  it('is "Bearer <token>" when a token is stored', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi')
    await apiFetch('/customers')
    expect(sentHeaders().get('Authorization')).toBe('Bearer abc.def.ghi')
  })

  it('reads the token on every call, not once at import', async () => {
    await apiFetch('/customers')
    localStorage.setItem(TOKEN_KEY, 'after-login')
    await apiFetch('/customers')
    localStorage.removeItem(TOKEN_KEY)
    await apiFetch('/customers')

    const auth = fetchMock.mock.calls.map(([, init = {}]) => new Headers(init.headers).get('Authorization'))
    expect(auth).toEqual([null, 'Bearer after-login', null])
  })
})

describe('apiFetch response', () => {
  it('returns { ok, status, data } for a successful JSON response', async () => {
    const user = { id: 1, username: 'admin', is_admin: true }
    fetchMock.mockResolvedValueOnce(jsonResponse({ token: 't', user }))
    const result = await apiFetch('/login', { method: 'POST', body: '{}' })
    expect(result).toEqual({ ok: true, status: 200, data: { token: 't', user } })
  })

  it('treats 201 as ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 5 }, 201))
    const result = await apiFetch('/customers', { method: 'POST', body: '{}' })
    expect(result).toEqual({ ok: true, status: 201, data: { id: 5 } })
  })

  it('does not throw on a 4xx and returns the error body', async () => {
    const body = { error: 'Login failed. Please check Username and Password' }
    fetchMock.mockResolvedValueOnce(jsonResponse(body, 401))
    const result = await apiFetch('/login', { method: 'POST', body: '{}' })
    expect(result).toEqual({ ok: false, status: 401, data: body })
  })

  it('returns data: null for a 204 with no body', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    const result = await apiFetch('/notes/1', { method: 'DELETE' })
    expect(result).toEqual({ ok: true, status: 204, data: null })
  })

  it('returns data: null instead of throwing when a 500 sends HTML', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('<h1>Internal Server Error</h1>', { status: 500, headers: { 'Content-Type': 'text/html' } }),
    )
    const result = await apiFetch('/check_session')
    expect(result).toEqual({ ok: false, status: 500, data: null })
  })

  it('returns the JSON body of a 500 when there is one', async () => {
    //Flask currently answers bad/expired tokens this way (known backend issue)
    fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Internal Server Error' }, 500))
    const result = await apiFetch('/check_session')
    expect(result).toEqual({ ok: false, status: 500, data: { message: 'Internal Server Error' } })
  })
})
