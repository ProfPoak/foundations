import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../src/api.js'
import EventsSection from '../src/components/customer/EventsSection.jsx'

//Day 4, Step 7: EventsSection passes customerId and onAddEvent to EventForm,
//and puts each created event at the top of the list without refetching
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//The marker remembers the event id it was first created with. If the list uses the array
//index as the key, React reuses the old item for the new event, and the two ids disagree
vi.mock('../src/components/customer/EventItem.jsx', () => ({
  default: function EventItemMarker({ event }) {
    const [firstId] = useState(event.id)
    return <li>Event {event.id} (created for {firstId})</li>
  },
}))
//The marker shows the customerId it got, and its buttons hand a new event to onAddEvent
vi.mock('../src/components/customer/EventForm.jsx', () => ({
  default: ({ customerId, onAddEvent }) => (
    <div>
      <p>EventForm for {customerId}</p>
      <button type="button" onClick={() => onAddEvent(makeEvent(101, '2026-09-30T18:00:00+00:00'))}>
        Fake add 101
      </button>
      <button type="button" onClick={() => onAddEvent(makeEvent(102, '2026-09-30T18:05:00+00:00'))}>
        Fake add 102
      </button>
    </div>
  ),
}))

function makeEvent(id, datetime) {
  return {
    id, datetime, interaction: 'call', notes: null, employee_id: 1, customer_id: 7,
    employee: { id: 1, username: 'admin', is_admin: true },
  }
}

const EVENTS = [
  makeEvent(12, '2026-09-30T15:00:00+00:00'),
  makeEvent(5, '2026-08-01T12:00:00+00:00'),
]

beforeEach(() => {
  apiFetch.mockReset()
})

async function renderLoaded(events = EVENTS) {
  apiFetch.mockResolvedValue({ ok: true, status: 200, data: events })
  render(<EventsSection customerId="7" />)
  await screen.findByText(events.length ? /^Event 12/ : 'No events yet')
}

function add(id) {
  fireEvent.click(screen.getByRole('button', { name: `Fake add ${id}` }))
}

function shownIds() {
  return screen.queryAllByText(/^Event \d+/).map(li => Number(li.textContent.match(/^Event (\d+)/)[1]))
}

describe('EventsSection: wiring up EventForm', () => {
  it('passes the customerId to EventForm', async () => {
    await renderLoaded()
    expect(screen.getByText('EventForm for 7')).toBeInTheDocument()
  })
})

describe('EventsSection: adding an event', () => {
  it('puts the new event at the top of the list', async () => {
    await renderLoaded()
    add(101)
    expect(shownIds()).toEqual([101, 12, 5])
  })

  it('keeps putting newer events on top', async () => {
    await renderLoaded()
    add(101)
    add(102)
    expect(shownIds()).toEqual([102, 101, 12, 5])
  })

  it('keys each item by event id, so every item stays matched to its own event', async () => {
    //key={index} hands the new event to the item that used to be at index 0
    await renderLoaded()
    add(101)
    for (const li of screen.getAllByText(/^Event \d+/)) {
      const [, id, firstId] = li.textContent.match(/^Event (\d+) \(created for (\d+)\)$/)
      expect(firstId, li.textContent).toBe(id)
    }
  })

  it('replaces "No events yet" with the first event', async () => {
    await renderLoaded([])
    add(101)
    expect(screen.queryByText('No events yet')).not.toBeInTheDocument()
    expect(shownIds()).toEqual([101])
  })

  it('does not request the events again', async () => {
    //The created event comes from the server already, so there's nothing to refetch
    await renderLoaded()
    add(101)
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
