import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { apiFetch } from '../src/services/api.js'
import { INTERACTIONS } from '../src/utils/constants.js'
import EventForm from '../src/components/customer/EventForm.jsx'

//Day 4, Steps 4–6: EventForm POSTs a new event itself, hands the created event up, and resets
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))

//What the server sends back: it adds id, datetime, employee_id and employee
const CREATED = {
  id: 50, datetime: '2026-09-30T17:52:10.417705+00:00', interaction: 'meeting',
  notes: 'Went over the quote', employee_id: 1, customer_id: 7,
  employee: { id: 1, username: 'admin', is_admin: true },
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
  const onAddEvent = vi.fn()
  render(<EventForm customerId="7" onAddEvent={onAddEvent} />)
  return onAddEvent
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

function type(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function clickLog() {
  fireEvent.click(screen.getByRole('button', { name: 'Log Event' }))
}

function form() {
  return screen.getByRole('button', { name: 'Log Event' }).closest('form')
}

//Lets the awaited apiFetch resolve and React re-render
async function flush() {
  await act(async () => {})
}

//A promise the test settles by hand, to look at the form mid-request
function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

function sentBody() {
  const [, options] = apiFetch.mock.calls[0]
  return JSON.parse(options.body)
}

describe('EventForm: fields', () => {
  it('has an Interaction <select> with one option per INTERACTIONS entry', () => {
    renderForm()
    const select = screen.getByLabelText('Interaction')
    expect(select.tagName).toBe('SELECT')
    expect(Array.from(select.options).map(o => o.value)).toEqual(INTERACTIONS)
  })

  it('starts the Interaction on the first entry, not ""', () => {
    //The server rejects interaction: "" with "Must be one of: ..."
    renderForm()
    expect(screen.getByLabelText('Interaction')).toHaveValue(INTERACTIONS[0])
  })

  it('has an empty Notes <textarea>', () => {
    renderForm()
    const notes = screen.getByLabelText('Notes')
    expect(notes.tagName).toBe('TEXTAREA')
    expect(notes).toHaveValue('')
  })

  it('names the fields after the keys the server expects', () => {
    renderForm()
    expect(screen.getByLabelText('Interaction')).toHaveAttribute('name', 'interaction')
    expect(screen.getByLabelText('Notes')).toHaveAttribute('name', 'notes')
  })

  it('updates both fields as you type', () => {
    renderForm()
    type('Interaction', 'meeting')
    type('Notes', 'Went over the quote')
    expect(screen.getByLabelText('Interaction')).toHaveValue('meeting')
    expect(screen.getByLabelText('Notes')).toHaveValue('Went over the quote')
  })

  it('has a Log Event submit button inside a noValidate form', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Log Event' })).toHaveAttribute('type', 'submit')
    expect(form()).not.toBeNull()
    expect(form().noValidate).toBe(true)
  })

  it('makes no request just by rendering', () => {
    const onAddEvent = renderForm()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onAddEvent).not.toHaveBeenCalled()
  })
})

describe('EventForm: the request', () => {
  it('POSTs to /customers/:customerId/events', async () => {
    respond(true, 201, CREATED)
    renderForm()
    clickLog()
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers/7/events')
    expect(options.method).toBe('POST')
  })

  it('sends exactly interaction and notes, never employee_id', async () => {
    //The server takes the employee from the token
    respond(true, 201, CREATED)
    renderForm()
    type('Interaction', 'meeting')
    type('Notes', 'Went over the quote')
    clickLog()
    await flush()
    expect(sentBody()).toEqual({ interaction: 'meeting', notes: 'Went over the quote' })
  })

  it('sends the default interaction when you only type notes', async () => {
    respond(true, 201, CREATED)
    renderForm()
    type('Notes', 'Quick check-in')
    clickLog()
    await flush()
    expect(sentBody()).toEqual({ interaction: INTERACTIONS[0], notes: 'Quick check-in' })
  })

  it('submits when the form is submitted, not only on click', async () => {
    respond(true, 201, CREATED)
    renderForm()
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

describe('EventForm: success', () => {
  it('calls onAddEvent once with the server\'s created event', async () => {
    //Only the server's version has the id, datetime and employee the list needs
    respond(true, 201, CREATED)
    const onAddEvent = renderForm()
    type('Interaction', 'meeting')
    type('Notes', 'Went over the quote')
    clickLog()
    await flush()
    expect(onAddEvent).toHaveBeenCalledTimes(1)
    expect(onAddEvent).toHaveBeenCalledWith(CREATED)
  })

  it('does not call onAddEvent before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const onAddEvent = renderForm()
    clickLog()
    await flush()
    expect(onAddEvent).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
    expect(onAddEvent).toHaveBeenCalledTimes(1)
  })

  it('resets the form for the next event', async () => {
    respond(true, 201, CREATED)
    renderForm()
    type('Interaction', 'meeting')
    type('Notes', 'Went over the quote')
    clickLog()
    await flush()
    expect(screen.getByLabelText('Interaction')).toHaveValue(INTERACTIONS[0])
    expect(screen.getByLabelText('Notes')).toHaveValue('')
  })

  it('sends the fresh values for the next event, not the previous ones', async () => {
    respond(true, 201, CREATED)
    renderForm()
    type('Interaction', 'meeting')
    type('Notes', 'First')
    clickLog()
    await flush()
    type('Notes', 'Second')
    clickLog()
    await flush()
    const [, options] = apiFetch.mock.calls[1]
    expect(JSON.parse(options.body)).toEqual({ interaction: INTERACTIONS[0], notes: 'Second' })
  })
})

describe('EventForm: failure', () => {
  it('shows a field error from the server and does not call onAddEvent', async () => {
    respond(false, 400, { errors: { interaction: ['Missing data for required field.'] } })
    const onAddEvent = renderForm()
    clickLog()
    expect(await screen.findByText('interaction: Missing data for required field.')).toBeInTheDocument()
    expect(onAddEvent).not.toHaveBeenCalled()
  })

  it('keeps what you typed', async () => {
    respond(false, 400, { error: 'Something is off' })
    renderForm()
    type('Interaction', 'meeting')
    type('Notes', 'Keep me')
    clickLog()
    await screen.findByText('Something is off')
    expect(screen.getByLabelText('Interaction')).toHaveValue('meeting')
    expect(screen.getByLabelText('Notes')).toHaveValue('Keep me')
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderForm()
    clickLog()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('clears the old error as soon as you submit again', async () => {
    respond(false, 400, { error: 'Something is off' })
    renderForm()
    clickLog()
    await screen.findByText('Something is off')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    clickLog()
    await flush()
    expect(screen.queryByText('Something is off')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
  })

  it('shows no error once a retry succeeds', async () => {
    respond(false, 400, { error: 'Something is off' })
    const onAddEvent = renderForm()
    clickLog()
    await screen.findByText('Something is off')

    respond(true, 201, CREATED)
    clickLog()
    await flush()
    expect(screen.queryByText('Something is off')).not.toBeInTheDocument()
    expect(onAddEvent).toHaveBeenCalledTimes(1)
  })
})
