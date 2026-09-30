import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import { useAuth } from '../src/context/AuthContext.jsx'
import NoteItem from '../src/components/customer/NoteItem.jsx'

//Day 4, Step 10: NoteItem shows one note: its content, author and local date and time.
//Editing and deleting (Block D) are tested in noteItemActions.test.jsx
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//NoteItem will read the logged-in user in Block D. Here that user is neither the author nor
//an admin, so these display tests keep passing once the Edit/Delete buttons exist
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const NOTE = {
  id: 2, datetime: '2026-08-11T12:49:03.373443+00:00',
  content: 'Prefers email.\nCall only after 5pm.', employee_id: 2, customer_id: 1,
  employee: { id: 2, username: 'douglasmoore', is_admin: false },
}

beforeEach(() => {
  apiFetch.mockReset()
  useAuth.mockReturnValue({ user: { id: 99, username: 'someone_else', is_admin: false } })
})

function renderItem(note = NOTE, handlers = {}) {
  return render(
    <ul>
      <NoteItem note={note} onUpdateNote={handlers.onUpdateNote ?? vi.fn()} onDeleteNote={handlers.onDeleteNote ?? vi.fn()} />
    </ul>,
  )
}

describe('NoteItem: display', () => {
  it('renders a single list item', () => {
    renderItem()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows the content, keeping its line break', () => {
    renderItem()
    expect(screen.getByRole('listitem').textContent).toContain('Prefers email.\nCall only after 5pm.')
  })

  it('shows the author by username', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('douglasmoore')
  })

  it('shows the date and time in local time, using toLocaleString', () => {
    renderItem()
    const local = new Date(NOTE.datetime).toLocaleString()
    expect(screen.getByRole('listitem')).toHaveTextContent(local)
  })

  it('does not show the raw UTC timestamp', () => {
    renderItem()
    expect(screen.getByRole('listitem').textContent).not.toContain('2026-08-11T12:49')
  })

  it('shows the values of the note it is given', () => {
    renderItem({
      ...NOTE, content: 'Asked about pricing', employee_id: 6,
      employee: { id: 6, username: 'tasha44', is_admin: false },
    })
    const li = screen.getByRole('listitem')
    expect(li).toHaveTextContent('Asked about pricing')
    expect(li).toHaveTextContent('tasha44')
  })

  it('makes no requests', () => {
    renderItem()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('shows no Edit or Delete buttons on someone else\'s note, for a non-admin', () => {
    renderItem()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
