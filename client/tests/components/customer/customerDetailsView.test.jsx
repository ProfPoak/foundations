import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { apiFetch } from '../../../src/services/api.js'
import CustomerDetails from '../../../src/components/customer/CustomerDetails.jsx'

//Day 3, Steps 3–5: CustomerDetails in view mode shows the name as a heading and the other fields as a <dl>
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

const VIEW_LABELS = ['Status', 'Birthday', 'Phone', 'Email', 'Address']

beforeEach(() => {
  apiFetch.mockReset()
})

function renderDetails(customer = ANA, onUpdate = vi.fn()) {
  return render(<CustomerDetails customer={customer} onUpdate={onUpdate} />)
}

function labels() {
  return Array.from(document.querySelectorAll('dl dt')).map(dt => dt.textContent.trim())
}

//The <dd> right after the <dt> with this label
function valueFor(label) {
  const dt = Array.from(document.querySelectorAll('dl dt')).find(el => el.textContent.trim() === label)
  expect(dt, `no <dt> labelled "${label}"`).toBeDefined()
  const dd = dt.nextElementSibling
  expect(dd?.tagName, `the <dt> "${label}" is not followed by a <dd>`).toBe('DD')
  return dd.textContent
}

describe('CustomerDetails view mode: layout', () => {
  it('shows the full name as the page heading', () => {
    renderDetails()
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Diaz' })).toBeInTheDocument()
  })

  it('has an Edit customer button', () => {
    renderDetails()
    expect(screen.getByRole('button', { name: 'Edit customer' })).toBeInTheDocument()
  })

  it('shows Status, Birthday, Phone, Email and Address as <dt> labels, in that order', () => {
    renderDetails()
    expect(labels()).toEqual(VIEW_LABELS)
  })

  it('does not list First name or Last name separately (the heading shows the name)', () => {
    renderDetails()
    expect(labels()).not.toContain('First name')
    expect(labels()).not.toContain('Last name')
  })

  it('shows no inputs and no Save or Cancel buttons', () => {
    renderDetails()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})

describe('CustomerDetails view mode: values', () => {
  it('shows the status', () => {
    renderDetails()
    expect(valueFor('Status').trim()).toMatch(/^client$/i)
  })

  it('shows the birthday exactly as the server sent it (no Date parsing)', () => {
    //new Date('1990-05-17') is UTC midnight, which is May 16 anywhere west of London
    renderDetails()
    expect(valueFor('Birthday').trim()).toBe('1990-05-17')
  })

  it('shows the phone as the server formatted it', () => {
    renderDetails()
    expect(valueFor('Phone').trim()).toBe('(555) 123-4567')
  })

  it('shows the email', () => {
    renderDetails()
    expect(valueFor('Email').trim()).toBe('ana@example.com')
  })

  it('keeps the newline in the address', () => {
    renderDetails()
    expect(valueFor('Address').trim()).toBe('12 Main St\nSpringfield, IL 62701')
  })

  it('shows — for every empty optional field', () => {
    renderDetails(BARE)
    for (const label of ['Birthday', 'Phone', 'Email', 'Address']) {
      expect(valueFor(label).trim(), label).toBe('—')
    }
  })

  it('still shows the name and status of a customer with empty fields', () => {
    renderDetails(BARE)
    expect(screen.getByRole('heading', { level: 1, name: 'Ben Anderson' })).toBeInTheDocument()
    expect(valueFor('Status').trim()).toMatch(/^potential$/i)
  })

  it('never shows "null" or "undefined"', () => {
    renderDetails(BARE)
    expect(document.body.textContent).not.toMatch(/null|undefined/)
  })
})

describe('CustomerDetails view mode: props', () => {
  it('shows the new values when the customer prop changes', () => {
    //What happens after a save: CustomerPage calls setCustomer, and CustomerDetails re-renders.
    //Copying the prop into state would keep showing the old values
    const { rerender } = renderDetails()
    const updated = { ...ANA, full_name: 'Ana Lopez', last_name: 'Lopez', phone: '(555) 987-6543' }
    rerender(<CustomerDetails customer={updated} onUpdate={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Ana Lopez' })).toBeInTheDocument()
    expect(valueFor('Phone').trim()).toBe('(555) 987-6543')
  })

  it('makes no requests and does not call onUpdate just by rendering', () => {
    const onUpdate = vi.fn()
    renderDetails(ANA, onUpdate)
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdate).not.toHaveBeenCalled()
  })
})
