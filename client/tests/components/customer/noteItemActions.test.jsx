import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { apiFetch } from '../../../src/services/api.js'
import { useAuth } from '../../../src/context/AuthContext.jsx'
import NoteItem from '../../../src/components/customer/NoteItem.jsx'

//Day 4, Steps 11–13: NoteItem shows Edit/Delete only to the author or an admin, edits the
//content in place (PATCH /notes/:id with only {content}), and deletes (DELETE /notes/:id)
vi.mock('../../../src/services/api.js', () => ({ apiFetch: vi.fn() }))
vi.mock('../../../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const AUTHOR = { id: 2, username: 'douglasmoore', is_admin: false }
const ADMIN = { id: 1, username: 'admin', is_admin: true }
const OTHER = { id: 6, username: 'tasha44', is_admin: false }

const NOTE = {
  id: 2, datetime: '2026-08-11T12:49:03.373443+00:00', content: 'Prefers email.',
  employee_id: 2, customer_id: 1, employee: { ...AUTHOR },
}

//React logs each controlled/uncontrolled warning only once per run, so every test checks for it
let controlledWarnings
beforeEach(() => {
  apiFetch.mockReset()
  useAuth.mockReturnValue({ user: AUTHOR })
  controlledWarnings = []
  const original = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args.map(String).join(' ')
    if (/controlled/i.test(message)) controlledWarnings.push(message)
    else original(...args)
  })
})

afterEach(() => {
  expect(controlledWarnings, 'React warned about a controlled/uncontrolled input').toEqual([])
})

function loginAs(user) {
  useAuth.mockReturnValue({ user })
}

function renderItem(note = NOTE) {
  const onUpdateNote = vi.fn()
  const onDeleteNote = vi.fn()
  const view = render(
    <ul><NoteItem note={note} onUpdateNote={onUpdateNote} onDeleteNote={onDeleteNote} /></ul>,
  )
  return { ...view, onUpdateNote, onDeleteNote }
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

function button(name) {
  return screen.getByRole('button', { name })
}

function click(name) {
  fireEvent.click(button(name))
}

function editBox() {
  return screen.getByLabelText('Edit note')
}

function typeEdit(value) {
  fireEvent.change(editBox(), { target: { value } })
}

async function flush() {
  await act(async () => {})
}

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

function isEditing() {
  return screen.queryByLabelText('Edit note') !== null
}

describe('NoteItem: who sees Edit and Delete', () => {
  it('the author sees both', () => {
    loginAs(AUTHOR)
    renderItem()
    expect(button('Edit')).toBeInTheDocument()
    expect(button('Delete')).toBeInTheDocument()
  })

  it('an admin sees both on someone else\'s note', () => {
    loginAs(ADMIN)
    renderItem()
    expect(button('Edit')).toBeInTheDocument()
    expect(button('Delete')).toBeInTheDocument()
  })

  it('another non-admin sees neither', () => {
    loginAs(OTHER)
    renderItem()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('compares ids, not usernames', () => {
    //Same username as the author but a different id: not the author
    loginAs({ id: 99, username: 'douglasmoore', is_admin: false })
    renderItem()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('uses note.employee_id to find the author', () => {
    //The logged-in user matches employee_id; the nested employee says otherwise
    loginAs({ id: 2, username: 'renamed', is_admin: false })
    renderItem({ ...NOTE, employee: { id: 7, username: 'someone', is_admin: false } })
    expect(button('Edit')).toBeInTheDocument()
  })

  it('the buttons do nothing just by rendering', () => {
    const { onUpdateNote, onDeleteNote } = renderItem()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdateNote).not.toHaveBeenCalled()
    expect(onDeleteNote).not.toHaveBeenCalled()
  })
})

describe('NoteItem: entering edit mode', () => {
  it('opens an "Edit note" box holding the current content', () => {
    renderItem()
    click('Edit')
    expect(editBox().tagName).toBe('TEXTAREA')
    expect(editBox()).toHaveValue('Prefers email.')
  })

  it('gives the box an id that includes the note id, so each note\'s box is unique', () => {
    renderItem()
    click('Edit')
    expect(editBox()).toHaveAttribute('id', 'edit-note-2')
  })

  it('keeps the edit boxes of two notes apart', () => {
    render(
      <ul>
        <NoteItem note={NOTE} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />
        <NoteItem note={{ ...NOTE, id: 3, content: 'Second note' }} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} />
      </ul>,
    )
    const [first, second] = screen.getAllByRole('listitem')
    fireEvent.click(within(second).getByRole('button', { name: 'Edit' }))
    fireEvent.click(within(first).getByRole('button', { name: 'Edit' }))
    expect(within(first).getByLabelText('Edit note')).toHaveValue('Prefers email.')
    expect(within(second).getByLabelText('Edit note')).toHaveValue('Second note')
  })

  it('shows Save and Cancel, and hides Edit and Delete while editing', () => {
    renderItem()
    click('Edit')
    expect(button('Save')).toHaveAttribute('type', 'submit')
    expect(button('Cancel')).toHaveAttribute('type', 'button')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('puts the box in a noValidate form', () => {
    renderItem()
    click('Edit')
    const form = editBox().closest('form')
    expect(form).not.toBeNull()
    expect(form.noValidate).toBe(true)
  })

  it('updates the box as you type', () => {
    renderItem()
    click('Edit')
    typeEdit('Prefers phone.')
    expect(editBox()).toHaveValue('Prefers phone.')
  })

  it('makes no request just by opening edit mode', () => {
    renderItem()
    click('Edit')
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe('NoteItem: saving an edit', () => {
  it('PATCHes /notes/:id with exactly { content }', async () => {
    //Sending the whole note gets "Cannot modify restricted fields"
    respond(true, 200, { ...NOTE, content: 'Prefers phone.' })
    renderItem()
    click('Edit')
    typeEdit('Prefers phone.')
    click('Save')
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/notes/2')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({ content: 'Prefers phone.' })
  })

  it('calls onUpdateNote once with the server\'s note and closes edit mode', async () => {
    const saved = { ...NOTE, content: 'Prefers phone.' }
    respond(true, 200, saved)
    const { onUpdateNote } = renderItem()
    click('Edit')
    typeEdit('Prefers phone.')
    click('Save')
    await flush()
    expect(onUpdateNote).toHaveBeenCalledTimes(1)
    expect(onUpdateNote).toHaveBeenCalledWith(saved)
    expect(isEditing()).toBe(false)
  })

  it('does not call onUpdateNote before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const { onUpdateNote } = renderItem()
    click('Edit')
    click('Save')
    await flush()
    expect(onUpdateNote).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 200, data: NOTE }))
    expect(onUpdateNote).toHaveBeenCalledTimes(1)
  })

  it('shows the server error, stays open, and keeps what you typed', async () => {
    respond(false, 400, { error: 'Content cannot be left empty' })
    const { onUpdateNote } = renderItem()
    click('Edit')
    typeEdit('')
    click('Save')
    expect(await screen.findByText('Content cannot be left empty')).toBeInTheDocument()
    expect(isEditing()).toBe(true)
    expect(editBox()).toHaveValue('')
    expect(onUpdateNote).not.toHaveBeenCalled()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderItem()
    click('Edit')
    click('Save')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows a 403 from the server (the buttons are only a convenience)', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    renderItem()
    click('Edit')
    click('Save')
    expect(await screen.findByText('unauthorized access')).toBeInTheDocument()
  })

  it('submits when the form is submitted, not only on click', async () => {
    respond(true, 200, NOTE)
    renderItem()
    click('Edit')
    fireEvent.submit(editBox().closest('form'))
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe('NoteItem: Cancel', () => {
  it('closes edit mode without a request or onUpdateNote', () => {
    const { onUpdateNote } = renderItem()
    click('Edit')
    typeEdit('Changed my mind')
    click('Cancel')
    expect(isEditing()).toBe(false)
    expect(button('Edit')).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdateNote).not.toHaveBeenCalled()
  })

  it('reopens with the original content, not what you typed', () => {
    renderItem()
    click('Edit')
    typeEdit('Changed my mind')
    click('Cancel')
    click('Edit')
    expect(editBox()).toHaveValue('Prefers email.')
  })

  it('hides an old error, and editing again starts clean', async () => {
    respond(false, 400, { error: 'Content cannot be left empty' })
    renderItem()
    click('Edit')
    typeEdit('')
    click('Save')
    await screen.findByText('Content cannot be left empty')
    click('Cancel')
    expect(screen.queryByText('Content cannot be left empty')).not.toBeInTheDocument()
    click('Edit')
    expect(screen.queryByText('Content cannot be left empty')).not.toBeInTheDocument()
  })

  it('opens the latest content after the note prop changes', () => {
    //useApiForm({ initial: { content: note.content } }) captures the first render's content
    const { rerender } = renderItem()
    rerender(
      <ul><NoteItem note={{ ...NOTE, content: 'Saved elsewhere' }} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} /></ul>,
    )
    click('Edit')
    expect(editBox()).toHaveValue('Saved elsewhere')
  })
})

describe('NoteItem: Delete', () => {
  it('sends DELETE /notes/:id', async () => {
    respond(true, 204, null)
    renderItem()
    click('Delete')
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/notes/2')
    expect(options.method).toBe('DELETE')
  })

  it('calls onDeleteNote with the note id, even though the 204 has no body', async () => {
    respond(true, 204, null)
    const { onDeleteNote } = renderItem()
    click('Delete')
    await flush()
    expect(onDeleteNote).toHaveBeenCalledTimes(1)
    expect(onDeleteNote).toHaveBeenCalledWith(2)
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('does not call onDeleteNote before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const { onDeleteNote } = renderItem()
    click('Delete')
    await flush()
    expect(onDeleteNote).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 204, data: null }))
    expect(onDeleteNote).toHaveBeenCalledTimes(1)
  })

  it('shows a 403 in view mode and does not call onDeleteNote', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    const { onDeleteNote } = renderItem()
    click('Delete')
    expect(await screen.findByText('unauthorized access')).toBeInTheDocument()
    expect(onDeleteNote).not.toHaveBeenCalled()
    expect(button('Delete')).toBeInTheDocument()
  })

  it('treats a failure with no body as a failure, not a delete', async () => {
    //A 204 and a bodiless 500 both have data === null; only ok tells them apart
    respond(false, 500, null)
    const { onDeleteNote } = renderItem()
    click('Delete')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(onDeleteNote).not.toHaveBeenCalled()
  })

  it('shows "Note not found" when the note is already gone', async () => {
    respond(false, 404, { error: 'Note not found' })
    renderItem()
    click('Delete')
    expect(await screen.findByText('Note not found')).toBeInTheDocument()
  })

  it('clears the old error as soon as you try again', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    renderItem()
    click('Delete')
    await screen.findByText('unauthorized access')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    click('Delete')
    await flush()
    expect(screen.queryByText('unauthorized access')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 204, data: null }))
  })
})
