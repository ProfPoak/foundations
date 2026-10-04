import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useParams } from 'react-router'
import CustomerResults from '../src/components/home/CustomerResults.jsx'
import CustomerRow from '../src/components/home/CustomerRow.jsx'

//Day 2, Steps 4 and 5: the results list and one row per customer

function customer(id, first_name, last_name, extra = {}) {
  return {
    id, first_name, last_name, full_name: `${first_name} ${last_name}`,
    status: 'client', phone: '(555) 123-4567', email: null, birthday: null, address: null,
    ...extra,
  }
}

const ANA = customer(7, 'Ana', 'Diaz', { status: 'potential', phone: '(555) 987-6543' })
const BEN = customer(12, 'Ben', 'Anderson', { status: 'inactive', phone: null })
const CARLA = customer(3, 'Carla', 'Smith')

//CustomerRow renders an <li>, so it needs a <ul> around it to be valid markup
function renderRow(c) {
  return render(
    <MemoryRouter>
      <ul><CustomerRow customer={c} /></ul>
    </MemoryRouter>,
  )
}

function renderResults(customers) {
  return render(
    <MemoryRouter>
      <CustomerResults customers={customers} />
    </MemoryRouter>,
  )
}

describe('CustomerRow', () => {
  it('renders a single list item', () => {
    renderRow(ANA)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows the full name as a link to /customers/:id', () => {
    renderRow(ANA)
    expect(screen.getByRole('link', { name: 'Ana Diaz' })).toHaveAttribute('href', '/customers/7')
  })

  it('shows the status', () => {
    renderRow(ANA)
    expect(within(screen.getByRole('listitem')).getByText(/potential/)).toBeInTheDocument()
  })

  it('shows the phone exactly as the server formatted it', () => {
    renderRow(ANA)
    expect(within(screen.getByRole('listitem')).getByText(/\(555\) 987-6543/)).toBeInTheDocument()
  })

  it('shows "—" when the phone is null', () => {
    renderRow(BEN)
    const row = screen.getByRole('listitem')
    expect(row).toHaveTextContent('—')
    expect(row).not.toHaveTextContent('null')
  })

  it('clicking the name opens that customer\'s page', () => {
    function CustomerMarker() {
      return <p>Customer page {useParams().id}</p>
    }
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<ul><CustomerRow customer={BEN} /></ul>} />
          <Route path="/customers/:id" element={<CustomerMarker />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Ben Anderson' }))
    expect(screen.getByText('Customer page 12')).toBeInTheDocument()
  })
})

describe('CustomerResults', () => {
  it('shows "No customers found" for an empty list', () => {
    renderResults([])
    expect(screen.getByText('No customers found')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('renders one list item per customer, in the order given', () => {
    renderResults([BEN, ANA, CARLA])
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items.map(li => within(li).getByRole('link').textContent))
      .toEqual(['Ben Anderson', 'Ana Diaz', 'Carla Smith'])
  })

  it('links every customer to their own page', () => {
    renderResults([BEN, ANA, CARLA])
    expect(screen.getByRole('link', { name: 'Ben Anderson' })).toHaveAttribute('href', '/customers/12')
    expect(screen.getByRole('link', { name: 'Ana Diaz' })).toHaveAttribute('href', '/customers/7')
    expect(screen.getByRole('link', { name: 'Carla Smith' })).toHaveAttribute('href', '/customers/3')
  })

  it('does not show the empty message when there are customers', () => {
    renderResults([ANA])
    expect(screen.queryByText('No customers found')).not.toBeInTheDocument()
  })

  it('gives each row a key (no React key warning)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderResults([BEN, ANA, CARLA])
    const keyWarnings = consoleError.mock.calls.filter(args => args.join(' ').includes('key'))
    expect(keyWarnings).toEqual([])
  })

  it('keys rows by customer id, not array index', () => {
    //With index keys, React reuses the first row's element for whoever is now first,
    //so a customer's row would change DOM nodes whenever the search narrows
    const { rerender } = renderResults([BEN, ANA, CARLA])
    const anaRow = screen.getByRole('link', { name: 'Ana Diaz' }).closest('li')
    rerender(
      <MemoryRouter>
        <CustomerResults customers={[ANA, CARLA]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ana Diaz' }).closest('li')).toBe(anaRow)
  })
})
