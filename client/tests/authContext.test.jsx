import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AuthProvider, useAuth } from '../src/context/AuthContext.jsx'
import { apiFetch } from '../src/api.js'

//Day 1, Block C (Steps 6-11): AuthContext
//apiFetch is mocked, so these tests check what the context asks the API for and what it does with the answer
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))

//Change this if you pick a different localStorage key for the token
const TOKEN_KEY = 'token'

const ADMIN = { id: 1, username: 'admin', is_admin: true }
const NEW_USER = { id: 7, username: 'testuser', is_admin: false }

beforeEach(() => {
  localStorage.clear()
  apiFetch.mockReset()
  apiFetch.mockResolvedValue({ ok: false, status: 500, data: null })
})

//MemoryRouter is there in case AuthProvider uses router hooks like useNavigate
function wrapper({ children }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  )
}

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper })
}

//Renders and waits for the session check to finish, so tests can start from a settled state
async function renderSettled() {
  const hook = renderAuth()
  await waitFor(() => expect(hook.result.current.checkingSession).toBe(false))
  return hook
}

//Finds the apiFetch call for a path and returns its options with the body parsed
function sentTo(path) {
  const call = apiFetch.mock.calls.find(([p]) => p === path)
  if (!call) return undefined
  const [, options = {}] = call
  return { ...options, body: options.body === undefined ? undefined : JSON.parse(options.body) }
}

describe('AuthContext value (Steps 6 and 11)', () => {
  it('provides user, checkingSession, login, signup and logout', async () => {
    const { result } = await renderSettled()
    expect(result.current).toEqual(
      expect.objectContaining({
        user: null,
        checkingSession: false,
        login: expect.any(Function),
        signup: expect.any(Function),
        logout: expect.any(Function),
      }),
    )
  })

  it('does not store error messages in the context', async () => {
    const { result } = await renderSettled()
    //The form owns its errors (Step 8), so nothing error-shaped belongs here
    const keys = Object.keys(result.current).map((k) => k.toLowerCase())
    expect(keys.filter((k) => k.includes('error'))).toEqual([])
  })
})

describe('session restore on load (Step 7)', () => {
  it('with no token: finishes checking without calling the API', async () => {
    const { result } = await renderSettled()
    expect(result.current.user).toBeNull()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('with a token: starts with checkingSession true and user null while the check is in flight', () => {
    localStorage.setItem(TOKEN_KEY, 'good.token')
    apiFetch.mockReturnValue(new Promise(() => {}))
    const { result } = renderAuth()
    //This is what stops ProtectedRoute redirecting to /login on a refresh
    expect(result.current.checkingSession).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('with a token: calls /check_session', async () => {
    localStorage.setItem(TOKEN_KEY, 'good.token')
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: ADMIN })
    await renderSettled()
    expect(apiFetch.mock.calls.map(([p]) => p)).toEqual(['/check_session'])
  })

  it('calls /check_session only once, not on every render', async () => {
    localStorage.setItem(TOKEN_KEY, 'good.token')
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: ADMIN })
    const { result, rerender } = await renderSettled()
    rerender()
    rerender()
    await waitFor(() => expect(result.current.user).toEqual(ADMIN))
    expect(apiFetch.mock.calls.filter(([p]) => p === '/check_session')).toHaveLength(1)
  })

  it('ok response: sets user to the returned data and keeps the token', async () => {
    localStorage.setItem(TOKEN_KEY, 'good.token')
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: ADMIN })
    const { result } = await renderSettled()
    expect(result.current.user).toEqual(ADMIN)
    expect(localStorage.getItem(TOKEN_KEY)).toBe('good.token')
  })

  it('does not finish checking before the user is set', async () => {
    localStorage.setItem(TOKEN_KEY, 'good.token')
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: ADMIN })
    const seen = []
    const { result } = renderHook(
      () => {
        const auth = useAuth()
        seen.push({ checking: auth?.checkingSession, user: auth?.user })
        return auth
      },
      { wrapper },
    )
    await waitFor(() => expect(result.current.checkingSession).toBe(false))
    //No render may show "done checking, nobody logged in" for a valid token, or ProtectedRoute would bounce to /login
    expect(seen.filter((s) => s.checking === false && s.user === null)).toEqual([])
  })

  it.each([
    ['401 (the fixed backend)', { ok: false, status: 401, data: { msg: 'Token has expired' } }],
    ['500 with JSON (the current backend bug)', { ok: false, status: 500, data: { message: 'Internal Server Error' } }],
    ['500 with no JSON body', { ok: false, status: 500, data: null }],
  ])('%s: removes the token, leaves user null and finishes checking', async (_label, response) => {
    localStorage.setItem(TOKEN_KEY, 'junk')
    apiFetch.mockResolvedValue(response)
    const { result } = await renderSettled()
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})

//login and signup share the same contract, so both run through the same tests
describe.each([
  ['login (Step 8)', 'login', '/login', { ok: true, status: 200, data: { token: 'new.jwt', user: ADMIN } }, ADMIN],
  ['signup (Step 9)', 'signup', '/signup', { ok: true, status: 201, data: { token: 'new.jwt', user: NEW_USER } }, NEW_USER],
])('%s', (_label, fn, path, success, expectedUser) => {
  it(`POSTs the username and password to ${path} as JSON`, async () => {
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue(success)
    await act(() => result.current[fn]('someone', 'secret123'))
    const sent = sentTo(path)
    expect(sent).toBeDefined()
    expect(sent.method).toBe('POST')
    expect(sent.body).toEqual({ username: 'someone', password: 'secret123' })
  })

  it('on success: saves data.token to localStorage', async () => {
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue(success)
    await act(() => result.current[fn]('someone', 'secret123'))
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new.jwt')
  })

  it('on success: sets user to data.user, not the whole response body', async () => {
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue(success)
    await act(() => result.current[fn]('someone', 'secret123'))
    expect(result.current.user).toEqual(expectedUser)
  })

  it('on success: returns the whole apiFetch result', async () => {
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue(success)
    let returned
    await act(async () => {
      returned = await result.current[fn]('someone', 'secret123')
    })
    expect(returned).toEqual(success)
  })

  it('on failure: returns the whole result so the form can show the errors', async () => {
    const failure = { ok: false, status: 401, data: { error: 'Login failed. Please check Username and Password' } }
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue(failure)
    let returned
    await act(async () => {
      returned = await result.current[fn]('someone', 'wrong')
    })
    expect(returned).toEqual(failure)
  })

  it('on failure: does not store a token or set a user', async () => {
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue({ ok: false, status: 400, data: { errors: ['Username already taken'] } })
    await act(() => result.current[fn]('admin', 'password'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(result.current.user).toBeNull()
  })
})

describe('logout (Step 10)', () => {
  async function loggedIn() {
    localStorage.setItem(TOKEN_KEY, 'good.token')
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: ADMIN })
    const hook = await renderSettled()
    expect(hook.result.current.user).toEqual(ADMIN)
    apiFetch.mockClear()
    return hook
  }

  it('clears the user', async () => {
    const { result } = await loggedIn()
    act(() => result.current.logout())
    expect(result.current.user).toBeNull()
  })

  it('removes the token from localStorage', async () => {
    const { result } = await loggedIn()
    act(() => result.current.logout())
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('makes no API call', async () => {
    const { result } = await loggedIn()
    act(() => result.current.logout())
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('works after a login in the same session', async () => {
    const { result } = await renderSettled()
    apiFetch.mockResolvedValue({ ok: true, status: 200, data: { token: 'new.jwt', user: ADMIN } })
    await act(() => result.current.login('admin', 'password'))
    act(() => result.current.logout())
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
