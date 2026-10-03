import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { apiFetch } from '../src/services/api.js'
import NoteForm from '../src/components/customer/NoteForm.jsx'

//Day 4, Step 9: NoteForm POSTs a new note itself, hands the created note up, and clears the box
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))

//What the server sends back: it adds id, datetime, employee_id and employee
const CREATED = {
  id: 29, datetime: '2026-09-30T17:52:10.449793+00:00', content: 'Prefers email',
  employee_id: 1, customer_id: 7, employee: { id: 1, username: 'admin', is_admin: true },
}

//React logs each controlled/uncontrolled warning only once per run, so every test checks for it
let controlledWarnings
beforeEach(() => {
  apiFetch.mockReset()
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

function renderForm() {
  const onAddNote = vi.fn()
  render(<NoteForm customerId="7" onAddNote={onAddNote} />)
  return onAddNote
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

function typeNote(value) {
  fireEvent.change(screen.getByLabelText('New note'), { target: { value } })
}

function clickAdd() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Note' }))
}

function form() {
  return screen.getByRole('button', { name: 'Add Note' }).closest('form')
}

async function flush() {
  await act(async () => {})
}

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

function sentBody(call = 0) {
  const [, options] = apiFetch.mock.calls[call]
  return JSON.parse(options.body)
}

describe('NoteForm: fields', () => {
  it('has an empty "New note" <textarea> named content', () => {
    renderForm()
    const box = screen.getByLabelText('New note')
    expect(box.tagName).toBe('TEXTAREA')
    expect(box).toHaveAttribute('name', 'content')
    expect(box).toHaveValue('')
  })

  it('uses the id "new-note", so it never collides with a note\'s edit box', () => {
    renderForm()
    expect(screen.getByLabelText('New note')).toHaveAttribute('id', 'new-note')
  })

  it('updates as you type', () => {
    renderForm()
    typeNote('Prefers email')
    expect(screen.getByLabelText('New note')).toHaveValue('Prefers email')
  })

  it('has an Add Note submit button inside a noValidate form', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Add Note' })).toHaveAttribute('type', 'submit')
    expect(form()).not.toBeNull()
    expect(form().noValidate).toBe(true)
  })

  it('makes no request just by rendering', () => {
    const onAddNote = renderForm()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onAddNote).not.toHaveBeenCalled()
  })
})

describe('NoteForm: the request', () => {
  it('POSTs to /customers/:customerId/notes', async () => {
    respond(true, 201, CREATED)
    renderForm()
    typeNote('Prefers email')
    clickAdd()
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers/7/notes')
    expect(options.method).toBe('POST')
  })

  it('sends exactly { content }, never employee_id', async () => {
    respond(true, 201, CREATED)
    renderForm()
    typeNote('Prefers email')
    clickAdd()
    await flush()
    expect(sentBody()).toEqual({ content: 'Prefers email' })
  })

  it('sends a blank note as-is and lets the server reject it', async () => {
    //The server's "Content cannot be left empty" is the message the checkpoint wants to see
    respond(false, 400, { error: 'Content cannot be left empty' })
    renderForm()
    clickAdd()
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(sentBody()).toEqual({ content: '' })
  })

  it('submits when the form is submitted, not only on click', async () => {
    respond(true, 201, CREATED)
    renderForm()
    typeNote('Prefers email')
    fireEvent.submit(form())
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('prevents the browser from reloading the page', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderForm()
    expect(fireEvent.submit(form())).toBe(false)
  })
})

describe('NoteForm: success', () => {
  it('calls onAddNote once with the server\'s created note', async () => {
    respond(true, 201, CREATED)
    const onAddNote = renderForm()
    typeNote('Prefers email')
    clickAdd()
    await flush()
    expect(onAddNote).toHaveBeenCalledTimes(1)
    expect(onAddNote).toHaveBeenCalledWith(CREATED)
  })

  it('does not call onAddNote before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const onAddNote = renderForm()
    typeNote('Prefers email')
    clickAdd()
    await flush()
    expect(onAddNote).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
    expect(onAddNote).toHaveBeenCalledTimes(1)
  })

  it('clears the box for the next note', async () => {
    respond(true, 201, CREATED)
    renderForm()
    typeNote('Prefers email')
    clickAdd()
    await flush()
    expect(screen.getByLabelText('New note')).toHaveValue('')
  })

  it('sends only the new text for the next note', async () => {
    respond(true, 201, CREATED)
    renderForm()
    typeNote('First')
    clickAdd()
    await flush()
    typeNote('Second')
    clickAdd()
    await flush()
    expect(sentBody(1)).toEqual({ content: 'Second' })
  })
})

describe('NoteForm: failure', () => {
  it('shows "Content cannot be left empty" and does not call onAddNote', async () => {
    respond(false, 400, { error: 'Content cannot be left empty' })
    const onAddNote = renderForm()
    typeNote('   ')
    clickAdd()
    expect(await screen.findByText('Content cannot be left empty')).toBeInTheDocument()
    expect(onAddNote).not.toHaveBeenCalled()
  })

  it('keeps what you typed', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderForm()
    typeNote('Keep me')
    clickAdd()
    await screen.findByText('Server exploded')
    expect(screen.getByLabelText('New note')).toHaveValue('Keep me')
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderForm()
    typeNote('Prefers email')
    clickAdd()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('clears the old error as soon as you submit again', async () => {
    respond(false, 400, { error: 'Content cannot be left empty' })
    renderForm()
    clickAdd()
    await screen.findByText('Content cannot be left empty')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    typeNote('Now with text')
    clickAdd()
    await flush()
    expect(screen.queryByText('Content cannot be left empty')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
  })

  it('shows no error once a retry succeeds', async () => {
    respond(false, 400, { error: 'Content cannot be left empty' })
    const onAddNote = renderForm()
    clickAdd()
    await screen.findByText('Content cannot be left empty')

    respond(true, 201, CREATED)
    typeNote('Now with text')
    clickAdd()
    await flush()
    expect(screen.queryByText('Content cannot be left empty')).not.toBeInTheDocument()
    expect(onAddNote).toHaveBeenCalledTimes(1)
  })
})
