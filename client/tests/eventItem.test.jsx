import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import EventItem from '../src/components/customer/EventItem.jsx'

//Day 4, Step 3: EventItem shows one event: its type, local date and time, who logged it, and any notes
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))

const EVENT = {
  id: 3, datetime: '2026-08-07T23:08:18.481436+00:00', interaction: 'meeting',
  notes: 'Walked through the quote', employee_id: 6, customer_id: 1,
  employee: { id: 6, username: 'tasha44', is_admin: false },
}

beforeEach(() => {
  apiFetch.mockReset()
})

//EventItem renders an <li>, so it needs a <ul> around it to be valid HTML
function renderItem(event = EVENT) {
  return render(<ul><EventItem event={event} /></ul>)
}

//Leaf elements with no text, e.g. an empty <p> left behind for missing notes
function emptyLeaves(root) {
  return Array.from(root.querySelectorAll('*'))
    .filter(el => el.children.length === 0 && el.textContent.trim() === '')
}

describe('EventItem', () => {
  it('renders a single list item', () => {
    renderItem()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows the interaction', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('meeting')
  })

  it('shows the date and time in local time, using toLocaleString', () => {
    //The expected text is built the same way, so it matches whatever time zone the tests run in
    renderItem()
    const local = new Date(EVENT.datetime).toLocaleString()
    expect(screen.getByRole('listitem')).toHaveTextContent(local)
  })

  it('does not show the raw UTC timestamp', () => {
    renderItem()
    expect(screen.getByRole('listitem').textContent).not.toContain('2026-08-07T23:08')
  })

  it('shows who logged it by username', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('tasha44')
  })

  it('shows the notes', () => {
    renderItem()
    expect(screen.getByText('Walked through the quote')).toBeInTheDocument()
  })

  it('shows nothing for notes that are null: no "null" and no empty element', () => {
    renderItem({ ...EVENT, notes: null })
    const li = screen.getByRole('listitem')
    expect(li.textContent).not.toMatch(/null|undefined/)
    expect(emptyLeaves(li)).toEqual([])
  })

  it('shows nothing for notes that are "" (the server stores a blank textarea as "")', () => {
    renderItem({ ...EVENT, notes: '' })
    expect(emptyLeaves(screen.getByRole('listitem'))).toEqual([])
  })

  it('shows the values of the event it is given', () => {
    renderItem({
      ...EVENT, interaction: 'follow-up', notes: 'Call back Friday',
      employee: { id: 2, username: 'douglasmoore', is_admin: false },
    })
    const li = screen.getByRole('listitem')
    expect(li).toHaveTextContent('follow-up')
    expect(li).toHaveTextContent('douglasmoore')
    expect(li).toHaveTextContent('Call back Friday')
  })

  it('has no buttons (the API cannot edit or delete events)', () => {
    renderItem()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('makes no requests', () => {
    renderItem()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
