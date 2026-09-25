import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../src/App.jsx'

//Pages, NavBar, and guards are replaced with markers so these tests only check the wiring.
//Page content and guard logic get their own tests on later days, so these keep passing as those files grow.

vi.mock('../src/pages/HomePage.jsx', () => ({ default: () => <h1>HomePage</h1> }))
vi.mock('../src/pages/LoginPage.jsx', () => ({ default: () => <h1>LoginPage</h1> }))
vi.mock('../src/pages/SignupPage.jsx', () => ({ default: () => <h1>SignupPage</h1> }))
vi.mock('../src/pages/NewCustomerPage.jsx', () => ({ default: () => <h1>NewCustomerPage</h1> }))
vi.mock('../src/pages/AdminPage.jsx', () => ({ default: () => <h1>AdminPage</h1> }))
vi.mock('../src/pages/NotFound.jsx', () => ({ default: () => <h1>NotFound</h1> }))
vi.mock('../src/pages/CustomerPage.jsx', async () => {
  const { useParams } = await import('react-router')
  return {
    default: function CustomerPage() {
      return <h1>CustomerPage {useParams().id}</h1>
    },
  }
})
vi.mock('../src/components/layout/NavBar.jsx', () => ({ default: () => <nav>NavBar</nav> }))
vi.mock('../src/components/layout/ProtectedRoute.jsx', async () => {
  const { Outlet } = await import('react-router')
  return { default: () => <div data-testid="protected-route"><Outlet /></div> }
})
vi.mock('../src/components/layout/AdminRoute.jsx', async () => {
  const { Outlet } = await import('react-router')
  return { default: () => <div data-testid="admin-route"><Outlet /></div> }
})

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

const PAGES = ['HomePage', 'LoginPage', 'SignupPage', 'NewCustomerPage', 'CustomerPage', 'AdminPage', 'NotFound']

function renderedPages() {
  return screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent.split(' ')[0])
}

describe('App routes', () => {
  it.each([
    ['/', 'HomePage'],
    ['/login', 'LoginPage'],
    ['/signup', 'SignupPage'],
    ['/customers/new', 'NewCustomerPage'],
    ['/customers/7', 'CustomerPage'],
    ['/admin', 'AdminPage'],
  ])('%s renders %s and nothing else', (path, page) => {
    renderAt(path)
    expect(renderedPages()).toEqual([page])
  })

  it('renders inside a router from main.jsx instead of creating its own', () => {
    //A <BrowserRouter> inside App would throw "You cannot render a <Router> inside another <Router>"
    expect(() => renderAt('/')).not.toThrow()
  })

  it('passes the :id param to CustomerPage', () => {
    renderAt('/customers/42')
    expect(screen.getByRole('heading', { name: 'CustomerPage 42' })).toBeInTheDocument()
  })

  it('matches /customers/new before /customers/:id', () => {
    renderAt('/customers/new')
    expect(screen.queryByRole('heading', { name: /^CustomerPage/ })).not.toBeInTheDocument()
  })
})

describe('Layout', () => {
  it.each(['/', '/login', '/signup', '/customers/new', '/customers/7', '/admin', '/does-not-exist'])(
    'wraps %s with the NavBar and puts the page inside <main>',
    (path) => {
      renderAt(path)
      expect(screen.getByText('NavBar')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 }).closest('main')).not.toBeNull()
    },
  )
})

describe('ProtectedRoute and AdminRoute placement', () => {
  it.each(['/', '/customers/new', '/customers/7', '/admin'])('%s is inside ProtectedRoute', (path) => {
    renderAt(path)
    expect(screen.getByTestId('protected-route')).toContainElement(screen.getByRole('heading', { level: 1 }))
  })

  it.each(['/login', '/signup', '/does-not-exist'])('%s is public (outside ProtectedRoute)', (path) => {
    renderAt(path)
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument()
  })

  it('/admin is inside AdminRoute, which is inside ProtectedRoute', () => {
    renderAt('/admin')
    const admin = screen.getByTestId('admin-route')
    expect(admin).toContainElement(screen.getByRole('heading', { name: 'AdminPage' }))
    expect(screen.getByTestId('protected-route')).toContainElement(admin)
  })

  it.each(['/', '/customers/new', '/customers/7'])('%s is not behind AdminRoute', (path) => {
    renderAt(path)
    expect(screen.queryByTestId('admin-route')).not.toBeInTheDocument()
  })
})

describe('NotFound', () => {
  it.each(['/does-not-exist', '/customers/7/extra', '/admin/users'])('%s renders NotFound', (path) => {
    renderAt(path)
    expect(renderedPages()).toEqual(['NotFound'])
  })
})

//Sanity check on the mocks above, so a renamed page file fails loudly instead of silently rendering a stub
it('mocks every page in src/pages', async () => {
  const files = Object.keys(import.meta.glob('../src/pages/*.jsx'))
  const names = files.map((f) => f.split('/').pop().replace('.jsx', ''))
  expect(names.sort()).toEqual([...PAGES].sort())
})
