import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../src/services/api.js'
import NotesSection from '../src/components/customer/NotesSection.jsx'

//Day 4, Steps 8 and 9: NotesSection loads the customer's notes once, lists them newest first,
//and puts each note NoteForm creates at the top without refetching
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))
//The marker remembers the note id it was first created with. If the list uses the array
//index as the key, React reuses the old item for the new note, and the two ids disagree
vi.mock('../src/components/customer/NoteItem.jsx', () => ({
  default: function NoteItemMarker({ note }) {
    const [firstId] = useState(note.id)
    return <li>Note {note.id} (created for {firstId})</li>
  },
}))
//The marker shows the customerId it got, and its buttons hand a new note to onAddNote
vi.mock('../src/components/customer/NoteForm.jsx', () => ({
  default: ({ customerId, onAddNote }) => (
    <div>
      <p>NoteForm for {customerId}</p>
      <button type="button" onClick={() => onAddNote(makeNote(101, '2026-09-30T18:00:00+00:00'))}>
        Fake add 101
      </button>
      <button type="button" onClick={() => onAddNote(makeNote(102, '2026-09-30T18:05:00+00:00'))}>
        Fake add 102
      </button>
    </div>
  ),
}))

function makeNote(id, datetime) {
  return {
    id, datetime, content: `Note text ${id}`, employee_id: 1, customer_id: 7,
    employee: { id: 1, username: 'admin', is_admin: true },
  }
}

//Newest first, as the server sends them. Ids are deliberately out of order,
//so sorting by id (or re-sorting at all) changes the result
const NOTES = [
  makeNote(12, '2026-09-30T15:00:00+00:00'),
  makeNote(30, '2026-09-29T09:30:00+00:00'),
  makeNote(5, '2026-08-01T12:00:00+00:00'),
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
  return render(<NotesSection customerId={customerId} />)
}

async function renderLoaded(notes = NOTES) {
  respond(true, 200, notes)
  const view = renderSection()
  await screen.findByText(notes.length ? new RegExp(`^Note ${notes[0].id} `) : 'No notes yet')
  return view
}

function shownIds() {
  return screen.queryAllByText(/^Note \d+ /).map(li => Number(li.textContent.match(/^Note (\d+)/)[1]))
}

function add(id) {
  fireEvent.click(screen.getByRole('button', { name: `Fake add ${id}` }))
}

describe('NotesSection: loading the notes', () => {
  it('shows the Notes heading and Loading while the request is pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expect(screen.queryByText('No notes yet')).not.toBeInTheDocument()
  })

  it('requests GET /customers/:customerId/notes', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/customers/7/notes')
  })

  it('requests the notes only once', async () => {
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('renders one NoteItem per note inside a <ul>, in the order the server sent them', async () => {
    await renderLoaded()
    expect(shownIds()).toEqual([12, 30, 5])
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('keeps the heading after loading', async () => {
    await renderLoaded()
    expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument()
  })

  it('shows "No notes yet" when the customer has none', async () => {
    await renderLoaded([])
    expect(screen.getByText('No notes yet')).toBeInTheDocument()
    expect(shownIds()).toEqual([])
  })

  it('does not show "No notes yet" when there are notes', async () => {
    await renderLoaded()
    expect(screen.queryByText('No notes yet')).not.toBeInTheDocument()
  })
})

describe('NotesSection: a failed request', () => {
  it('shows the server error, keeps the heading, and stops loading', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderSection()
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderSection()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('does not claim there are no notes when the request failed', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderSection()
    await screen.findByText('Server exploded')
    expect(screen.queryByText('No notes yet')).not.toBeInTheDocument()
  })
})

describe('NotesSection: NoteForm', () => {
  it('renders NoteForm while loading', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderSection()
    expect(screen.getByText('NoteForm for 7')).toBeInTheDocument()
  })

  it('passes the customerId to NoteForm, even with no notes', async () => {
    await renderLoaded([])
    expect(screen.getByText('NoteForm for 7')).toBeInTheDocument()
  })
})

describe('NotesSection: adding a note', () => {
  it('puts the new note at the top of the list', async () => {
    await renderLoaded()
    add(101)
    expect(shownIds()).toEqual([101, 12, 30, 5])
  })

  it('keeps putting newer notes on top', async () => {
    await renderLoaded()
    add(101)
    add(102)
    expect(shownIds()).toEqual([102, 101, 12, 30, 5])
  })

  it('keys each item by note id, so every item stays matched to its own note', async () => {
    //key={index} hands the new note to the item that used to be at index 0
    await renderLoaded()
    add(101)
    for (const li of screen.getAllByText(/^Note \d+ /)) {
      const [, id, firstId] = li.textContent.match(/^Note (\d+) \(created for (\d+)\)$/)
      expect(firstId, li.textContent).toBe(id)
    }
  })

  it('replaces "No notes yet" with the first note', async () => {
    await renderLoaded([])
    add(101)
    expect(screen.queryByText('No notes yet')).not.toBeInTheDocument()
    expect(shownIds()).toEqual([101])
  })

  it('does not request the notes again', async () => {
    await renderLoaded()
    add(101)
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe('NotesSection: changing customer', () => {
  it('loads the new customer\'s notes when customerId changes', async () => {
    const { rerender } = await renderLoaded()
    respond(true, 200, [makeNote(99, '2026-09-30T10:00:00+00:00')])
    rerender(<NotesSection customerId="8" />)
    expect(await screen.findByText(/^Note 99 /)).toBeInTheDocument()
    expect(apiFetch).toHaveBeenLastCalledWith('/customers/8/notes')
  })
})
