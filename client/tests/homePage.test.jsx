import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { apiFetch } from '../src/api.js'
import HomePage from '../src/pages/HomePage.jsx'

//Day 2, Steps 1 and 3: HomePage loads the customers once and filters them by full_name
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//CustomerResults is Block B, so a marker lists the names it receives, in order
vi.mock('../src/components/home/CustomerResults.jsx', () => ({
  default: ({ customers }) => (
    <ul aria-label="results marker">
      {customers.map(c => <li key={c.id}>{c.full_name}</li>)}
    </ul>
  ),
}))

function customer(id, first_name, last_name) {
  return {
    id, first_name, last_name, full_name: `${first_name} ${last_name}`,
    status: 'client', phone: null, email: null, birthday: null, address: null,
  }
}

//Already in the server's last-name order
const CUSTOMERS = [
  customer(2, 'Ben', 'Anderson'),
  customer(1, 'Ana', 'Diaz'),
  customer(3, 'Carla', 'Smith'),
  customer(4, 'Dana', 'Smithers'),
]
const ALL_NAMES = CUSTOMERS.map(c => c.full_name)

beforeEach(() => {
  apiFetch.mockReset()
})

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

async function renderLoaded(customers = CUSTOMERS) {
  apiFetch.mockResolvedValue({ ok: true, status: 200, data: customers })
  renderHome()
  await screen.findByRole('list', { name: 'results marker' })
}

function shownNames() {
  const list = screen.getByRole('list', { name: 'results marker' })
  return within(list).queryAllByRole('listitem').map(li => li.textContent)
}

function typeSearch(value) {
  fireEvent.change(screen.getByLabelText('Search customers'), { target: { value } })
}

describe('HomePage: loading the customers', () => {
  it('shows Loading while the request is pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'results marker' })).not.toBeInTheDocument()
  })

  it('requests GET /customers', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/customers')
  })

  it('requests the customers only once', async () => {
    //A missing dependency array refetches after every render
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('passes every customer to CustomerResults, in the server order', async () => {
    await renderLoaded()
    expect(shownNames()).toEqual(ALL_NAMES)
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows the heading, the search box and the New Customer link once loaded', async () => {
    await renderLoaded()
    expect(screen.getByRole('heading', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search customers')).toHaveValue('')
    expect(screen.getByRole('link', { name: 'New Customer' })).toHaveAttribute('href', '/customers/new')
  })

  it('handles an empty customer list', async () => {
    await renderLoaded([])
    expect(shownNames()).toEqual([])
  })
})

describe('HomePage: a failed request', () => {
  it('shows the server error and stops loading', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 500, data: { error: 'Server exploded' } })
    renderHome()
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the error has no body', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 500, data: null })
    renderHome()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })
})

describe('HomePage: filtering by name', () => {
  it('filters as you type', async () => {
    await renderLoaded()
    typeSearch('smith')
    expect(shownNames()).toEqual(['Carla Smith', 'Dana Smithers'])
  })

  it('ignores case in both the search and the name', async () => {
    await renderLoaded()
    typeSearch('SMITH')
    expect(shownNames()).toEqual(['Carla Smith', 'Dana Smithers'])
    typeSearch('sMiThErS')
    expect(shownNames()).toEqual(['Dana Smithers'])
  })

  it('matches last names, not just first names', async () => {
    await renderLoaded()
    typeSearch('anderson')
    expect(shownNames()).toEqual(['Ben Anderson'])
  })

  it('matches across the first and last name (full_name)', async () => {
    await renderLoaded()
    typeSearch('ana d')
    expect(shownNames()).toEqual(['Ana Diaz'])
  })

  it('ignores spaces around the search', async () => {
    await renderLoaded()
    typeSearch('  diaz  ')
    expect(shownNames()).toEqual(['Ana Diaz'])
  })

  it('passes an empty list when nothing matches', async () => {
    await renderLoaded()
    typeSearch('zzzz')
    expect(shownNames()).toEqual([])
  })

  it('brings every customer back when the search is cleared', async () => {
    //Saving the filtered list back into customers loses the rest for good
    await renderLoaded()
    typeSearch('zzzz')
    typeSearch('')
    expect(shownNames()).toEqual(ALL_NAMES)
  })

  it('widens the results again when the search gets shorter', async () => {
    await renderLoaded()
    typeSearch('smithers')
    typeSearch('smith')
    expect(shownNames()).toEqual(['Carla Smith', 'Dana Smithers'])
  })

  it('keeps the search box in sync with what you typed', async () => {
    await renderLoaded()
    typeSearch('Ana')
    expect(screen.getByLabelText('Search customers')).toHaveValue('Ana')
  })

  it('does not request the customers again when searching', async () => {
    await renderLoaded()
    typeSearch('smith')
    typeSearch('')
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
