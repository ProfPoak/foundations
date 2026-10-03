import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { apiFetch } from '../src/services/api.js'
import { CUSTOMER_STATUSES } from '../src/utils/constants.js'
import CustomerDetails from '../src/components/customer/CustomerDetails.jsx'

//Day 3, Steps 6–8: the edit icon turns the fields into inputs in place, and Cancel throws the edits away
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))

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

const ALL_LABELS = ['First name', 'Last name', 'Status', 'Birthday', 'Phone', 'Email', 'Address']

//React logs each controlled/uncontrolled warning only once per run, so whichever test hits it
//first has to be the one that fails. Every test here checks for it; other errors pass through
let controlledWarnings
beforeEach(() => {
  apiFetch.mockReset()
  //Save is Block D. If a click here ever reaches apiFetch, it stays pending instead of crashing
  apiFetch.mockReturnValue(new Promise(() => {}))
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

function renderDetails(customer = ANA, onUpdate = vi.fn()) {
  return render(<CustomerDetails customer={customer} onUpdate={onUpdate} />)
}

function clickEdit() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit customer' }))
}

function clickCancel() {
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
}

function type(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function labels() {
  return Array.from(document.querySelectorAll('dl dt')).map(dt => dt.textContent.trim())
}

//The view-mode <dd> right after the <dt> with this label
function viewValue(label) {
  const dt = Array.from(document.querySelectorAll('dl dt')).find(el => el.textContent.trim() === label)
  expect(dt, `no <dt> labelled "${label}"`).toBeDefined()
  return dt.nextElementSibling.textContent.trim()
}

function expectViewMode(customer = ANA) {
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('First name')).not.toBeInTheDocument()
  expect(viewValue('Phone')).toBe(customer.phone ?? '—')
  expect(viewValue('Email')).toBe(customer.email ?? '—')
}

describe('CustomerDetails edit mode: entering it', () => {
  it('switches to inputs when the edit icon is clicked', () => {
    renderDetails()
    clickEdit()
    for (const label of ALL_LABELS) {
      expect(screen.getByLabelText(label), label).toBeInTheDocument()
    }
  })

  it('lists all seven fields as <dt> labels, in the same order as FIELDS', () => {
    renderDetails()
    clickEdit()
    expect(labels()).toEqual(ALL_LABELS)
  })

  it('replaces the values in place: the plain-text values are gone', () => {
    renderDetails()
    clickEdit()
    //Values now live inside inputs, which getByText can't see
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument()
    expect(screen.queryByText('(555) 123-4567')).not.toBeInTheDocument()
  })

  it('keeps the saved full name as the heading', () => {
    renderDetails()
    clickEdit()
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Diaz' })).toBeInTheDocument()
  })

  it('shows Save and Cancel buttons', () => {
    renderDetails()
    clickEdit()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('puts the inputs in a form with noValidate, so the server gets to answer', () => {
    renderDetails()
    clickEdit()
    const form = screen.getByLabelText('First name').closest('form')
    expect(form).not.toBeNull()
    expect(form.noValidate).toBe(true)
  })

  it('makes no request just by entering edit mode', () => {
    const onUpdate = vi.fn()
    renderDetails(ANA, onUpdate)
    clickEdit()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})

describe('CustomerDetails edit mode: the inputs', () => {
  it('fills every input with the current value', () => {
    renderDetails()
    clickEdit()
    expect(screen.getByLabelText('First name')).toHaveValue('Ana')
    expect(screen.getByLabelText('Last name')).toHaveValue('Diaz')
    expect(screen.getByLabelText('Status')).toHaveValue('client')
    expect(screen.getByLabelText('Birthday')).toHaveValue('1990-05-17')
    expect(screen.getByLabelText('Phone')).toHaveValue('(555) 123-4567')
    expect(screen.getByLabelText('Email')).toHaveValue('ana@example.com')
    expect(screen.getByLabelText('Address')).toHaveValue('12 Main St\nSpringfield, IL 62701')
  })

  it('uses the right input types', () => {
    renderDetails()
    clickEdit()
    expect(screen.getByLabelText('First name')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Last name')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Birthday')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
  })

  it('uses a <select> for Status with one option per CUSTOMER_STATUSES entry', () => {
    renderDetails()
    clickEdit()
    const status = screen.getByLabelText('Status')
    expect(status.tagName).toBe('SELECT')
    expect(Array.from(status.options).map(o => o.value)).toEqual(CUSTOMER_STATUSES)
  })

  it('uses a <textarea> for Address, so the newline survives', () => {
    //An <input> strips the \n, so saving any other field would rewrite the address
    renderDetails()
    clickEdit()
    expect(screen.getByLabelText('Address').tagName).toBe('TEXTAREA')
  })

  it('gives each input a name that matches its customer key', () => {
    renderDetails()
    clickEdit()
    expect(screen.getByLabelText('First name')).toHaveAttribute('name', 'first_name')
    expect(screen.getByLabelText('Last name')).toHaveAttribute('name', 'last_name')
    expect(screen.getByLabelText('Status')).toHaveAttribute('name', 'status')
    expect(screen.getByLabelText('Birthday')).toHaveAttribute('name', 'birthday')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('name', 'phone')
    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email')
    expect(screen.getByLabelText('Address')).toHaveAttribute('name', 'address')
  })

  it('updates each input as you type', () => {
    renderDetails()
    clickEdit()
    type('First name', 'Anna')
    type('Status', 'inactive')
    type('Phone', '5559876543')
    type('Address', '9 Oak Ave\nUnit 2')
    expect(screen.getByLabelText('First name')).toHaveValue('Anna')
    expect(screen.getByLabelText('Status')).toHaveValue('inactive')
    expect(screen.getByLabelText('Phone')).toHaveValue('5559876543')
    expect(screen.getByLabelText('Address')).toHaveValue('9 Oak Ave\nUnit 2')
  })

  it('changing one field leaves the others alone', () => {
    //Replacing formData with only the changed key wipes the rest. The DOM keeps the old text,
    //but React warns that those inputs went from controlled to uncontrolled (checked in afterEach)
    renderDetails()
    clickEdit()
    type('Phone', '5559876543')
    expect(screen.getByLabelText('First name')).toHaveValue('Ana')
    expect(screen.getByLabelText('Email')).toHaveValue('ana@example.com')
  })

  it('does not change the heading while you type', () => {
    renderDetails()
    clickEdit()
    type('First name', 'Anna')
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Diaz' })).toBeInTheDocument()
  })
})

describe('CustomerDetails edit mode: empty fields', () => {
  it('opens empty fields as empty inputs', () => {
    renderDetails(BARE)
    clickEdit()
    expect(screen.getByLabelText('Birthday')).toHaveValue('')
    expect(screen.getByLabelText('Phone')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Address')).toHaveValue('')
  })

  it('does not show — inside the inputs', () => {
    renderDetails(BARE)
    clickEdit()
    for (const label of ['Phone', 'Email', 'Address']) {
      expect(screen.getByLabelText(label), label).not.toHaveValue('—')
    }
  })

  it('does not warn about an uncontrolled input becoming controlled', () => {
    //value={null} makes an input uncontrolled, so null has to become '' (checked in afterEach)
    renderDetails(BARE)
    clickEdit()
    type('Phone', '5551234567')
    type('Email', 'ben@example.com')
    type('Address', '1 Elm St')
  })
})

describe('CustomerDetails edit mode: Cancel', () => {
  it('is type="button", so it can never submit the form', () => {
    //A <button> inside a <form> defaults to type="submit"
    renderDetails()
    clickEdit()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button')
  })

  it('goes back to view mode', () => {
    renderDetails()
    clickEdit()
    clickCancel()
    expectViewMode()
    expect(screen.getByRole('button', { name: 'Edit customer' })).toBeInTheDocument()
  })

  it('throws away what you typed and shows the original values', () => {
    renderDetails()
    clickEdit()
    type('Phone', '5559876543')
    type('Email', 'changed@example.com')
    clickCancel()
    expectViewMode()
  })

  it('makes no request and does not call onUpdate', () => {
    const onUpdate = vi.fn()
    renderDetails(ANA, onUpdate)
    clickEdit()
    type('Phone', '5559876543')
    clickCancel()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('opens the original values when you edit again', () => {
    //Resetting formData happens when editing starts, so old typing must not come back
    renderDetails()
    clickEdit()
    type('First name', 'Typed but cancelled')
    type('Status', 'inactive')
    clickCancel()
    clickEdit()
    expect(screen.getByLabelText('First name')).toHaveValue('Ana')
    expect(screen.getByLabelText('Status')).toHaveValue('client')
  })

  it('opens the latest customer values after the customer prop changes', () => {
    //useState(toFormData(customer)) captures the first render's values forever
    const { rerender } = renderDetails()
    clickEdit()
    clickCancel()
    const updated = { ...ANA, phone: '(555) 987-6543', status: 'inactive' }
    rerender(<CustomerDetails customer={updated} onUpdate={vi.fn()} />)
    clickEdit()
    expect(screen.getByLabelText('Phone')).toHaveValue('(555) 987-6543')
    expect(screen.getByLabelText('Status')).toHaveValue('inactive')
  })
})
