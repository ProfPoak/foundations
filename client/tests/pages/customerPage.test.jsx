import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link } from 'react-router'
import { apiFetch } from '../src/services/api.js'
import CustomerPage from '../src/pages/CustomerPage.jsx'

//Day 3, Steps 1 and 2: CustomerPage loads one customer by :id and handles loading, 404 and other errors
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))
//CustomerDetails is Blocks B–D. The marker shows the customer it receives, and its button
//hands an edited copy back through onUpdate, like a successful Save will
vi.mock('../src/components/customer/CustomerDetails.jsx', () => ({
  default: ({ customer, onUpdate }) => (
    <div>
      <p>Details for {customer.full_name}</p>
      <button type="button" onClick={() => onUpdate({ ...customer, full_name: 'Edited Name' })}>
        Fake save
      </button>
    </div>
  ),
}))
//The sections are Days 4 and 5. Each marker shows the customerId it was given
vi.mock('../src/components/customer/EventsSection.jsx', () => ({
  default: ({ customerId }) => <p>Events for {customerId}</p>,
}))
vi.mock('../src/components/customer/NotesSection.jsx', () => ({
  default: ({ customerId }) => <p>Notes for {customerId}</p>,
}))
vi.mock('../src/components/customer/TasksSection.jsx', () => ({
  default: ({ customerId }) => <p>Tasks for {customerId}</p>,
}))

function customer(id, first_name, last_name) {
  return {
    id, first_name, last_name, full_name: `${first_name} ${last_name}`,
    status: 'client', birthday: '1990-05-17', phone: '(555) 123-4567',
    email: `${first_name.toLowerCase()}@example.com`, address: '12 Main St',
  }
}

const ANA = customer(7, 'Ana', 'Diaz')
const BEN = customer(8, 'Ben', 'Anderson')

beforeEach(() => {
  apiFetch.mockReset()
})

//The Link sits outside <Routes>, so following it changes :id without unmounting the page
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Link to="/customers/8">Go to Ben</Link>
      <Routes>
        <Route path="/customers/:id" element={<CustomerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

async function renderLoaded(path = '/customers/7', data = ANA) {
  respond(true, 200, data)
  renderAt(path)
  await screen.findByText(`Details for ${data.full_name}`)
}

//Lets the awaited apiFetch resolve and React re-render
async function flush() {
  await act(async () => {})
}

function expectNoSections() {
  expect(screen.queryByText(/^Events for/)).not.toBeInTheDocument()
  expect(screen.queryByText(/^Notes for/)).not.toBeInTheDocument()
  expect(screen.queryByText(/^Tasks for/)).not.toBeInTheDocument()
}

function expectNoDetails() {
  expect(screen.queryByText(/^Details for/)).not.toBeInTheDocument()
}

describe('CustomerPage: loading the customer', () => {
  it('shows Loading while the request is pending, and nothing else', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderAt('/customers/7')
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expectNoDetails()
    expectNoSections()
  })

  it('requests GET /customers/:id using the id from the URL', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/customers/7')
  })

  it('requests the customer only once', async () => {
    //A missing dependency array refetches after every render
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('passes the loaded customer to CustomerDetails and stops loading', async () => {
    await renderLoaded()
    expect(screen.getByText('Details for Ana Diaz')).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('renders the Events, Notes and Tasks sections with the customer id', async () => {
    await renderLoaded()
    expect(screen.getByText('Events for 7')).toBeInTheDocument()
    expect(screen.getByText('Notes for 7')).toBeInTheDocument()
    expect(screen.getByText('Tasks for 7')).toBeInTheDocument()
  })

  it('does not show "Customer not found" for a customer that exists', async () => {
    await renderLoaded()
    expect(screen.queryByText('Customer not found')).not.toBeInTheDocument()
  })
})

describe('CustomerPage: a customer that does not exist', () => {
  it('shows "Customer not found" for a 404 with an error body', async () => {
    respond(false, 404, { error: 'Customer not found' })
    renderAt('/customers/9999')
    expect(await screen.findByText('Customer not found')).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Customer not found" for a 404 with no body (e.g. /customers/abc)', async () => {
    //Flask's own 404 isn't JSON, so data is null. Checking the body shows "Something went wrong"
    respond(false, 404, null)
    renderAt('/customers/abc')
    expect(await screen.findByText('Customer not found')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('shows "Customer not found" even when the 404 body says something else', async () => {
    //The message comes from the status, not from echoing the server's error
    respond(false, 404, { error: 'Nope' })
    renderAt('/customers/9999')
    expect(await screen.findByText('Customer not found')).toBeInTheDocument()
  })

  it('renders neither CustomerDetails nor the sections', async () => {
    //The sections fetch on their own from Day 4, so they must not appear for a missing customer
    respond(false, 404, { error: 'Customer not found' })
    renderAt('/customers/9999')
    await screen.findByText('Customer not found')
    expectNoDetails()
    expectNoSections()
  })

  it('links back to the customers list', async () => {
    respond(false, 404, null)
    renderAt('/customers/9999')
    await screen.findByText('Customer not found')
    const home = screen.getAllByRole('link').filter(link => link.getAttribute('href') === '/')
    expect(home).toHaveLength(1)
  })
})

describe('CustomerPage: other failed requests', () => {
  it('shows the server error for a non-404 failure', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderAt('/customers/7')
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(screen.queryByText('Customer not found')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderAt('/customers/7')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText('Customer not found')).not.toBeInTheDocument()
  })

  it('renders neither CustomerDetails nor the sections', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderAt('/customers/7')
    await screen.findByText('Server exploded')
    expectNoDetails()
    expectNoSections()
  })
})

describe('CustomerPage: updates and navigation', () => {
  it('replaces the customer with what CustomerDetails hands to onUpdate', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake save' }))
    expect(screen.getByText('Details for Edited Name')).toBeInTheDocument()
    expect(screen.queryByText('Details for Ana Diaz')).not.toBeInTheDocument()
  })

  it('does not request the customer again after onUpdate', async () => {
    //onUpdate hands over the server's response, so there's nothing to refetch
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake save' }))
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('loads the new customer when the :id in the URL changes', async () => {
    //With [] instead of [id], the page keeps showing the first customer
    await renderLoaded()
    respond(true, 200, BEN)
    fireEvent.click(screen.getByRole('link', { name: 'Go to Ben' }))
    expect(await screen.findByText('Details for Ben Anderson')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenLastCalledWith('/customers/8')
    expect(screen.getByText('Events for 8')).toBeInTheDocument()
  })

  it('shows "Customer not found" when the new :id does not exist', async () => {
    await renderLoaded()
    respond(false, 404, null)
    fireEvent.click(screen.getByRole('link', { name: 'Go to Ben' }))
    await flush()
    expect(await screen.findByText('Customer not found')).toBeInTheDocument()
    expectNoDetails()
  })
})
