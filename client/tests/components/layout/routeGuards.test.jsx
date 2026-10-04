import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigationType } from 'react-router'
import { useAuth } from '../src/context/AuthContext.jsx'
import ProtectedRoute from '../src/components/layout/ProtectedRoute.jsx'
import AdminRoute from '../src/components/layout/AdminRoute.jsx'

//Day 1, Steps 16 and 17: ProtectedRoute and AdminRoute
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const ADMIN = { id: 1, username: 'admin', is_admin: true }
const MEMBER = { id: 7, username: 'testuser', is_admin: false }

function setAuth({ user = null, checkingSession = false } = {}) {
  useAuth.mockReturnValue({ user, checkingSession, login: vi.fn(), signup: vi.fn(), logout: vi.fn() })
}

beforeEach(() => {
  useAuth.mockReset()
})

//Each marker page reports how it was reached, so the tests can tell a replace from a push
function Marker({ name }) {
  return <h1>{name} marker ({useNavigationType()})</h1>
}

//The guard wraps one child route at `path`; /login and / exist as redirect targets
function renderGuard(Guard, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Guard />}>
          <Route path={path} element={<Marker name="Guarded" />} />
        </Route>
        <Route path="/login" element={<Marker name="Login" />} />
        <Route path="/" element={<Marker name="Home" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute (Step 16)', () => {
  it('while checking the session: shows Loading and does not redirect', () => {
    //On a refresh user is null until /check_session answers; redirecting now would log the user out
    setAuth({ user: null, checkingSession: true })
    renderGuard(ProtectedRoute, '/customers/5')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByText(/Login marker/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Guarded marker/)).not.toBeInTheDocument()
  })

  it('no user: redirects to /login', () => {
    setAuth({ user: null })
    renderGuard(ProtectedRoute, '/customers/5')
    expect(screen.getByText(/Login marker/)).toBeInTheDocument()
    expect(screen.queryByText(/Guarded marker/)).not.toBeInTheDocument()
  })

  it('no user: replaces the blocked page in history instead of pushing /login', () => {
    setAuth({ user: null })
    renderGuard(ProtectedRoute, '/customers/5')
    expect(screen.getByText('Login marker (REPLACE)')).toBeInTheDocument()
  })

  it.each([
    ['a regular user', MEMBER],
    ['an admin', ADMIN],
  ])('logged in as %s: renders the child route through <Outlet />', (_label, user) => {
    setAuth({ user })
    renderGuard(ProtectedRoute, '/customers/5')
    expect(screen.getByText(/Guarded marker/)).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})

describe('AdminRoute (Step 17)', () => {
  it('while checking the session: shows Loading and does not redirect', () => {
    setAuth({ user: null, checkingSession: true })
    renderGuard(AdminRoute, '/admin')
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByText(/Home marker/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Guarded marker/)).not.toBeInTheDocument()
  })

  it('a regular user: redirects to /', () => {
    setAuth({ user: MEMBER })
    renderGuard(AdminRoute, '/admin')
    expect(screen.getByText(/Home marker/)).toBeInTheDocument()
    expect(screen.queryByText(/Guarded marker/)).not.toBeInTheDocument()
  })

  it('a regular user: replaces /admin in history instead of pushing /', () => {
    setAuth({ user: MEMBER })
    renderGuard(AdminRoute, '/admin')
    expect(screen.getByText('Home marker (REPLACE)')).toBeInTheDocument()
  })

  it('no user: redirects to / without crashing on user.is_admin', () => {
    //ProtectedRoute normally catches this first, but AdminRoute must not throw on its own
    setAuth({ user: null })
    renderGuard(AdminRoute, '/admin')
    expect(screen.getByText(/Home marker/)).toBeInTheDocument()
  })

  it('an admin: renders the child route through <Outlet />', () => {
    setAuth({ user: ADMIN })
    renderGuard(AdminRoute, '/admin')
    expect(screen.getByText(/Guarded marker/)).toBeInTheDocument()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})
