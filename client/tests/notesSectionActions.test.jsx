import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import NotesSection from '../src/components/customer/NotesSection.jsx'

//Day 4, Steps 12 and 13: NotesSection hands each NoteItem onUpdateNote and onDeleteNote,
//and keeps the list in sync without refetching
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//The marker's buttons act like a successful save or delete inside NoteItem
vi.mock('../src/components/customer/NoteItem.jsx', () => ({
  default: ({ note, onUpdateNote, onDeleteNote }) => (
    <li>
      <span>{note.content}</span>
      <button type="button" onClick={() => onUpdateNote({ ...note, content: `${note.content} (edited)` })}>
        Fake update {note.id}
      </button>
      <button type="button" onClick={() => onDeleteNote(note.id)}>
        Fake delete {note.id}
      </button>
    </li>
  ),
}))
vi.mock('../src/components/customer/NoteForm.jsx', () => ({
  default: () => <p>NoteForm marker</p>,
}))

function makeNote(id, content) {
  return {
    id, datetime: '2026-09-30T15:00:00+00:00', content, employee_id: 1, customer_id: 7,
    employee: { id: 1, username: 'admin', is_admin: true },
  }
}

const NOTES = [makeNote(12, 'newest'), makeNote(30, 'middle'), makeNote(5, 'oldest')]

beforeEach(() => {
  apiFetch.mockReset()
})

async function renderLoaded(notes = NOTES) {
  apiFetch.mockResolvedValue({ ok: true, status: 200, data: notes })
  render(<NotesSection customerId="7" />)
  await screen.findByText(notes[0].content)
}

function shownContent() {
  return screen.getAllByRole('listitem').map(li => li.querySelector('span').textContent)
}

describe('NotesSection: updating a note', () => {
  it('replaces the edited note in the same spot', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake update 30' }))
    expect(shownContent()).toEqual(['newest', 'middle (edited)', 'oldest'])
  })

  it('leaves the other notes alone', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake update 12' }))
    expect(shownContent()).toEqual(['newest (edited)', 'middle', 'oldest'])
  })
})

describe('NotesSection: deleting a note', () => {
  it('removes only that note', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 30' }))
    expect(shownContent()).toEqual(['newest', 'oldest'])
  })

  it('shows "No notes yet" after the last note is deleted', async () => {
    await renderLoaded([makeNote(12, 'only one')])
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 12' }))
    expect(screen.getByText('No notes yet')).toBeInTheDocument()
  })
})

describe('NotesSection: no refetching', () => {
  it('does not request the notes again after an update or a delete', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake update 12' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 5' }))
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
