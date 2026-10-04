import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import { apiFetch } from '../../../src/services/api.js'
import EventsSection from '../../../src/components/customer/EventsSection.jsx'

//Day 4, Steps 1 and 2: EventsSection loads the customer's events once and lists them newest first
vi.mock('../../../src/services/api.js', () => ({ apiFetch: vi.fn() }))
//EventItem is tested on its own. The marker shows which event it received
vi.mock('../../../src/components/customer/EventItem.jsx', () => ({
  default: ({ event }) => <li>Event {event.id}</li>,
}))
//EventForm is Block B. The marker only shows where it renders
vi.mock('../../../src/components/customer/EventForm.jsx', () => ({
  default: () => <p>EventForm marker</p>,
}))

function makeEvent(id, datetime) {
  return {
    id, datetime, interaction: 'call', notes: null, employee_id: 1, customer_id: 7,
    employee: { id: 1, username: 'admin', is_admin: true },
  }
}

//Newest first, as the server sends them. Ids are deliberately out of order,
//so sorting by id (or re-sorting at all) changes the result
const EVENTS = [
  makeEvent(12, '2026-09-30T15:00:00+00:00'),
  makeEvent(30, '2026-09-29T09:30:00+00:00'),
  makeEvent(5, '2026-08-01T12:00:00+00:00'),
]

//Catches a missing or duplicate key on the list items; other errors pass through
let keyWarnings
beforeEach(() => {
  apiFetch.mockReset()
  keyWarnings = []
  const original = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args.map(String).join(' ')
    if (/unique "key"|same key/i.test(message)) keyWarnings.push(message)
    else original(...args)
  })
})

afterEach(() => {
  expect(keyWarnings, 'React warned about list keys').toEqual([])
})

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

function renderSection(customerId = '7') {
  return render(<EventsSection customerId={customerId} />)
}

async function renderLoaded(events = EVENTS) {
  respond(true, 200, events)
  const view = renderSection()
  await screen.findByText(events.length ? `Event ${events[0].id}` : 'No events yet')
  return view
}

function shownIds() {
  return screen.queryAllByText(/^Event \d+$/).map(li => li.textContent)
}

describe('EventsSection: loading the events', () => {
  it('shows the Events heading and Loading while the request is pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(screen.getByRole('heading', { level: 2, name: 'Events' })).toBeInTheDocument()
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expect(screen.queryByText('No events yet')).not.toBeInTheDocument()
  })

  it('requests GET /customers/:customerId/events', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/customers/7/events')
  })

  it('requests the events only once', async () => {
    //A missing dependency array refetches after every render
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('renders one EventItem per event, in the order the server sent them', async () => {
    await renderLoaded()
    expect(shownIds()).toEqual(['Event 12', 'Event 30', 'Event 5'])
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('puts the EventItems inside a <ul>', async () => {
    await renderLoaded()
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('keeps the heading after loading', async () => {
    await renderLoaded()
    expect(screen.getByRole('heading', { level: 2, name: 'Events' })).toBeInTheDocument()
  })

  it('shows "No events yet" when the customer has none', async () => {
    await renderLoaded([])
    expect(screen.getByText('No events yet')).toBeInTheDocument()
    expect(shownIds()).toEqual([])
  })

  it('does not show "No events yet" when there are events', async () => {
    await renderLoaded()
    expect(screen.queryByText('No events yet')).not.toBeInTheDocument()
  })
})

describe('EventsSection: the form', () => {
  it('renders EventForm while loading', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(screen.getByText('EventForm marker')).toBeInTheDocument()
  })

  it('renders EventForm once loaded, even with no events', async () => {
    await renderLoaded([])
    expect(screen.getByText('EventForm marker')).toBeInTheDocument()
  })
})

describe('EventsSection: a failed request', () => {
  it('shows the server error, keeps the heading, and stops loading', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderSection()
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Events' })).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderSection()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('does not claim there are no events when the request failed', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderSection()
    await screen.findByText('Server exploded')
    expect(screen.queryByText('No events yet')).not.toBeInTheDocument()
  })
})

describe('EventsSection: changing customer', () => {
  it('loads the new customer\'s events when customerId changes', async () => {
    //With [] instead of [customerId], the old customer's events stay
    const { rerender } = await renderLoaded()
    respond(true, 200, [makeEvent(99, '2026-09-30T10:00:00+00:00')])
    rerender(<EventsSection customerId="8" />)
    expect(await screen.findByText('Event 99')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenLastCalledWith('/customers/8/events')
  })
})
