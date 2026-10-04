import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../../../src/services/api.js'
import CustomerDetails from '../../../src/components/customer/CustomerDetails.jsx'

//Day 3, Step 9: Save PATCHes the seven editable fields, hands the server's customer to onUpdate,
//and on failure shows the error while edit mode stays open
vi.mock('../../../src/services/api.js', () => ({ apiFetch: vi.fn() }))

const ANA = {
  id: 7, first_name: 'Ana', last_name: 'Diaz', full_name: 'Ana Diaz',
  status: 'client', birthday: '1990-05-17', phone: '(555) 123-4567',
  email: 'ana@example.com', address: '12 Main St\nSpringfield, IL 62701',
}

//What the server sends for a customer created with only a name
const BARE = {
  id: 8, first_name: 'Ben', last_name: 'Anderson', full_name: 'Ben Anderson',
  status: 'potential', birthday: null, phone: null, email: null, address: null,
}

const EDITABLE_KEYS = ['address', 'birthday', 'email', 'first_name', 'last_name', 'phone', 'status']

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

//Stands in for CustomerPage: holds the customer and replaces it with whatever onUpdate receives
function Harness({ initial, onUpdate }) {
  const [customer, setCustomer] = useState(initial)
  return (
    <CustomerDetails
      customer={customer}
      onUpdate={updated => { onUpdate(updated); setCustomer(updated) }}
    />
  )
}

function renderDetails(customer = ANA) {
  const onUpdate = vi.fn()
  render(<Harness initial={customer} onUpdate={onUpdate} />)
  return onUpdate
}

function renderEditing(customer = ANA) {
  const onUpdate = renderDetails(customer)
  fireEvent.click(screen.getByRole('button', { name: 'Edit customer' }))
  return onUpdate
}

function type(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function clickSave() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

//A promise the test settles by hand, to look at the component mid-request
function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

//Lets the awaited apiFetch resolve and React re-render
async function flush() {
  await act(async () => {})
}

function sentBody() {
  const [, options] = apiFetch.mock.calls[0]
  return JSON.parse(options.body)
}

function viewValue(label) {
  const dt = Array.from(document.querySelectorAll('dl dt')).find(el => el.textContent.trim() === label)
  expect(dt, `no <dt> labelled "${label}"`).toBeDefined()
  return dt.nextElementSibling.textContent.trim()
}

function isEditing() {
  return screen.queryByRole('button', { name: 'Save' }) !== null
}

describe('CustomerDetails Save: the request', () => {
  it('PATCHes /customers/:id using the customer id', async () => {
    respond(true, 200, ANA)
    renderEditing()
    clickSave()
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers/7')
    expect(options.method).toBe('PATCH')
  })

  it('sends exactly the seven editable fields, never id or full_name', async () => {
    //The server rejects id and full_name with "Unknown field."
    respond(true, 200, ANA)
    renderEditing()
    clickSave()
    await flush()
    expect(Object.keys(sentBody()).sort()).toEqual(EDITABLE_KEYS)
  })

  it('sends what you typed, plus the untouched values', async () => {
    respond(true, 200, ANA)
    renderEditing()
    type('First name', 'Anna')
    type('Status', 'inactive')
    type('Phone', '5559876543')
    clickSave()
    await flush()
    expect(sentBody()).toEqual({
      first_name: 'Anna', last_name: 'Diaz', status: 'inactive', birthday: '1990-05-17',
      phone: '5559876543', email: 'ana@example.com', address: '12 Main St\nSpringfield, IL 62701',
    })
  })

  it('sends empty fields as "" (the server turns them into null)', async () => {
    respond(true, 200, BARE)
    renderEditing(BARE)
    clickSave()
    await flush()
    expect(sentBody()).toMatchObject({ birthday: '', phone: '', email: '', address: '' })
  })

  it('sends a cleared field as ""', async () => {
    respond(true, 200, { ...ANA, email: null })
    renderEditing()
    type('Email', '')
    clickSave()
    await flush()
    expect(sentBody().email).toBe('')
  })

  it('submits when the form is submitted (e.g. Enter in an input), not only on click', async () => {
    respond(true, 200, ANA)
    renderEditing()
    fireEvent.submit(screen.getByLabelText('First name').closest('form'))
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('prevents the browser from reloading the page', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderEditing()
    const notPrevented = fireEvent.submit(screen.getByLabelText('First name').closest('form'))
    expect(notPrevented).toBe(false)
  })
})

describe('CustomerDetails Save: success', () => {
  it('calls onUpdate once with the server response, not the form data', async () => {
    const saved = { ...ANA, first_name: 'Anna', full_name: 'Anna Diaz', phone: '(555) 987-6543' }
    respond(true, 200, saved)
    const onUpdate = renderEditing()
    type('First name', 'Anna')
    type('Phone', '5559876543')
    clickSave()
    await flush()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledWith(saved)
  })

  it('does not call onUpdate before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const onUpdate = renderEditing()
    clickSave()
    await flush()
    expect(onUpdate).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 200, data: ANA }))
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('goes back to view mode', async () => {
    respond(true, 200, ANA)
    renderEditing()
    clickSave()
    await flush()
    expect(isEditing()).toBe(false)
    expect(screen.getByRole('button', { name: 'Edit customer' })).toBeInTheDocument()
  })

  it('shows the phone the way the server formatted it', async () => {
    respond(true, 200, { ...ANA, phone: '(555) 987-6543' })
    renderEditing()
    type('Phone', '5559876543')
    clickSave()
    await flush()
    expect(viewValue('Phone')).toBe('(555) 987-6543')
  })

  it('shows the new name in the heading', async () => {
    respond(true, 200, { ...ANA, first_name: 'Anna', full_name: 'Anna Diaz' })
    renderEditing()
    type('First name', 'Anna')
    clickSave()
    await flush()
    expect(screen.getByRole('heading', { level: 1, name: 'Anna Diaz' })).toBeInTheDocument()
  })

  it('shows — for a field the server saved as null', async () => {
    respond(true, 200, { ...ANA, email: null })
    renderEditing()
    type('Email', '')
    clickSave()
    await flush()
    expect(viewValue('Email')).toBe('—')
  })

  it('opens the saved values the next time you edit', async () => {
    respond(true, 200, { ...ANA, phone: '(555) 987-6543', status: 'inactive' })
    renderEditing()
    type('Phone', '5559876543')
    type('Status', 'inactive')
    clickSave()
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Edit customer' }))
    expect(screen.getByLabelText('Phone')).toHaveValue('(555) 987-6543')
    expect(screen.getByLabelText('Status')).toHaveValue('inactive')
  })
})

describe('CustomerDetails Save: failure', () => {
  it('shows a single server error and stays in edit mode', async () => {
    respond(false, 400, { error: 'First Name cannot be left empty' })
    const onUpdate = renderEditing()
    type('First name', '')
    clickSave()
    expect(await screen.findByText('First Name cannot be left empty')).toBeInTheDocument()
    expect(isEditing()).toBe(true)
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('keeps what you typed in the inputs', async () => {
    respond(false, 400, { error: 'First Name cannot be left empty' })
    renderEditing()
    type('First name', '')
    type('Phone', '5559876543')
    clickSave()
    await screen.findByText('First Name cannot be left empty')
    expect(screen.getByLabelText('First name')).toHaveValue('')
    expect(screen.getByLabelText('Phone')).toHaveValue('5559876543')
  })

  it('shows field errors from the schema', async () => {
    respond(false, 400, { errors: { email: ['Not a valid email address.'] } })
    renderEditing()
    type('Email', 'bob@')
    clickSave()
    expect(await screen.findByText('email: Not a valid email address.')).toBeInTheDocument()
  })

  it('shows "Email already in use" for a 409', async () => {
    respond(false, 409, { error: 'Email already in use' })
    renderEditing()
    clickSave()
    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
    expect(isEditing()).toBe(true)
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderEditing()
    clickSave()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(isEditing()).toBe(true)
  })

  it('does not change the heading or the saved values', async () => {
    respond(false, 400, { error: 'Phone number must have 10 digits' })
    renderEditing()
    type('First name', 'Anna')
    type('Phone', '123')
    clickSave()
    await screen.findByText('Phone number must have 10 digits')
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Diaz' })).toBeInTheDocument()
  })
})

describe('CustomerDetails Save: clearing errors', () => {
  it('clears the old error as soon as you save again', async () => {
    respond(false, 400, { error: 'Phone number must have 10 digits' })
    renderEditing()
    type('Phone', '123')
    clickSave()
    await screen.findByText('Phone number must have 10 digits')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    type('Phone', '5559876543')
    clickSave()
    await flush()
    //Still waiting on the server, and the stale message is already gone
    expect(screen.queryByText('Phone number must have 10 digits')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 200, data: ANA }))
  })

  it('returns to view mode with no error once a retry succeeds', async () => {
    respond(false, 400, { error: 'Phone number must have 10 digits' })
    renderEditing()
    type('Phone', '123')
    clickSave()
    await screen.findByText('Phone number must have 10 digits')

    respond(true, 200, { ...ANA, phone: '(555) 987-6543' })
    type('Phone', '5559876543')
    clickSave()
    await flush()
    expect(isEditing()).toBe(false)
    expect(screen.queryByText('Phone number must have 10 digits')).not.toBeInTheDocument()
    expect(viewValue('Phone')).toBe('(555) 987-6543')
  })

  it('Cancel after an error hides the error, and editing again starts clean', async () => {
    respond(false, 400, { error: 'Phone number must have 10 digits' })
    const onUpdate = renderEditing()
    type('Phone', '123')
    clickSave()
    await screen.findByText('Phone number must have 10 digits')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Phone number must have 10 digits')).not.toBeInTheDocument()
    expect(viewValue('Phone')).toBe('(555) 123-4567')

    fireEvent.click(screen.getByRole('button', { name: 'Edit customer' }))
    expect(screen.queryByText('Phone number must have 10 digits')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toHaveValue('(555) 123-4567')
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
