import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { useAuth } from '../src/context/AuthContext.jsx'
import NavBar from '../src/components/layout/NavBar.jsx'

//Day 1, Step 18: NavBar
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const ADMIN = { id: 1, username: 'admin', is_admin: true }
const MEMBER = { id: 7, username: 'testuser', is_admin: false }
let auth

function setUser(user) {
  auth = { user, checkingSession: false, login: vi.fn(), signup: vi.fn(), logout: vi.fn() }
  useAuth.mockReturnValue(auth)
}

beforeEach(() => {
  useAuth.mockReset()
})

//Marker pages under the nav make navigation visible
function renderNav(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NavBar />
      <Routes>
        <Route path="/" element={<h1>Home marker</h1>} />
        <Route path="/login" element={<h1>Login marker</h1>} />
        <Route path="/admin" element={<h1>Admin marker</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

//Anchored so "Logged in as…" text or a Logout control never counts as a Login link
const links = {
  home: () => screen.queryByRole('link', { name: /^home$/i }),
  admin: () => screen.queryByRole('link', { name: /admin portal/i }),
  login: () => screen.queryByRole('link', { name: /^log ?in$/i }),
  signup: () => screen.queryByRole('link', { name: /^sign ?up$/i }),
}

function logoutButton() {
  return screen.queryByRole('button', { name: /log ?out/i })
}

//Reads the nav's text as a whole, so "Logged in as <strong>name</strong>" also counts
function navText() {
  return screen.getByRole('navigation').textContent
}

describe('NavBar logged out', () => {
  beforeEach(() => setUser(null))

  it('shows Home, Login and Signup links to the right paths', () => {
    renderNav()
    expect(links.home()).toHaveAttribute('href', '/')
    expect(links.login()).toHaveAttribute('href', '/login')
    expect(links.signup()).toHaveAttribute('href', '/signup')
  })

  it('hides Admin Portal, Logout and the "Logged in as" text', () => {
    renderNav()
    expect(links.admin()).not.toBeInTheDocument()
    expect(logoutButton()).not.toBeInTheDocument()
    expect(navText()).not.toMatch(/logged in as/i)
  })
})

describe('NavBar logged in as a regular user', () => {
  beforeEach(() => setUser(MEMBER))

  it('shows Home and "Logged in as testuser"', () => {
    renderNav()
    expect(links.home()).toHaveAttribute('href', '/')
    expect(navText()).toMatch(/logged in as\s*testuser/i)
  })

  it('shows a Logout button', () => {
    renderNav()
    expect(logoutButton()).toBeInTheDocument()
  })

  it('hides Login, Signup and Admin Portal', () => {
    renderNav()
    expect(links.login()).not.toBeInTheDocument()
    expect(links.signup()).not.toBeInTheDocument()
    expect(links.admin()).not.toBeInTheDocument()
  })
})

describe('NavBar logged in as an admin', () => {
  beforeEach(() => setUser(ADMIN))

  it('shows an Admin Portal link to /admin', () => {
    renderNav()
    expect(links.admin()).toHaveAttribute('href', '/admin')
  })

  it('also shows Home, "Logged in as admin" and Logout', () => {
    renderNav()
    expect(links.home()).toBeInTheDocument()
    expect(navText()).toMatch(/logged in as\s*admin/i)
    expect(logoutButton()).toBeInTheDocument()
  })
})

describe('NavBar Logout', () => {
  beforeEach(() => setUser(MEMBER))

  it('calls logout() once', () => {
    renderNav()
    fireEvent.click(logoutButton())
    expect(auth.logout).toHaveBeenCalledTimes(1)
  })

  it('navigates to /login', () => {
    renderNav('/')
    expect(screen.getByText('Home marker')).toBeInTheDocument()
    fireEvent.click(logoutButton())
    expect(screen.getByText('Login marker')).toBeInTheDocument()
  })
})
