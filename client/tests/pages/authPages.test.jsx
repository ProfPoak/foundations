import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useNavigationType } from 'react-router'
import { useAuth } from '../src/context/AuthContext.jsx'
import LoginPage from '../src/pages/LoginPage.jsx'
import SignupPage from '../src/pages/SignupPage.jsx'

//Day 1, Step 15: logged-in users are redirected away from /login and /signup
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))
//The forms are replaced with markers so these tests only check the page's redirect
vi.mock('../src/components/auth/LoginForm.jsx', () => ({ default: () => <p>LoginForm marker</p> }))
vi.mock('../src/components/auth/SignupForm.jsx', () => ({ default: () => <p>SignupForm marker</p> }))

const ADMIN = { id: 1, username: 'admin', is_admin: true }

function setUser(user) {
  useAuth.mockReturnValue({ user, checkingSession: false, login: vi.fn(), signup: vi.fn(), logout: vi.fn() })
}

beforeEach(() => {
  useAuth.mockReset()
})

//Home reports how it was reached, so the test can tell a replace from a push
function Home() {
  return <h1>Home marker ({useNavigationType()})</h1>
}

function renderAt(path, Page) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Page />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe.each([
  ['LoginPage', '/login', LoginPage, 'LoginForm marker'],
  ['SignupPage', '/signup', SignupPage, 'SignupForm marker'],
])('%s', (_name, path, Page, formMarker) => {
  it('logged out: shows the form', () => {
    setUser(null)
    renderAt(path, Page)
    expect(screen.getByText(formMarker)).toBeInTheDocument()
    expect(screen.queryByText(/Home marker/)).not.toBeInTheDocument()
  })

  it('logged in: redirects to /', () => {
    setUser(ADMIN)
    renderAt(path, Page)
    expect(screen.getByText(/Home marker/)).toBeInTheDocument()
    expect(screen.queryByText(formMarker)).not.toBeInTheDocument()
  })

  it(`logged in: replaces ${path} in history instead of pushing /`, () => {
    //With a push, the back button would return to ${path} and bounce straight back to /
    setUser(ADMIN)
    renderAt(path, Page)
    expect(screen.getByText('Home marker (REPLACE)')).toBeInTheDocument()
  })
})
