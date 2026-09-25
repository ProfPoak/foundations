import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import { CUSTOMER_STATUSES } from '../src/constants.js'
import CustomerForm from '../src/components/newCustomer/CustomerForm.jsx'

//Day 2, Steps 6-8: one controlled formData object; the form hands it to onSubmit and never fetches
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))

const TEXT_FIELDS = ['First name', 'Last name', 'Birthday', 'Phone', 'Email', 'Address']

const EMPTY = {
  first_name: '', last_name: '', status: 'potential',
  birthday: '', phone: '', email: '', address: '',
}

beforeEach(() => {
  apiFetch.mockReset()
})

function renderForm(onSubmit = vi.fn()) {
  render(<CustomerForm onSubmit={onSubmit} />)
  return onSubmit
}

function field(label) {
  return screen.getByLabelText(label)
}

function change(label, value) {
  fireEvent.change(field(label), { target: { value } })
}

function submitButton() {
  return screen.getByRole('button', { name: 'Create Customer' })
}

describe('CustomerForm: fields', () => {
  it.each([...TEXT_FIELDS, 'Status'])('has a field labeled "%s"', label => {
    renderForm()
    expect(field(label)).toBeInTheDocument()
  })

  it.each(TEXT_FIELDS)('"%s" starts empty', label => {
    renderForm()
    expect(field(label)).toHaveValue('')
  })

  it('Status is a select that starts on "potential"', () => {
    renderForm()
    expect(field('Status').tagName).toBe('SELECT')
    expect(field('Status')).toHaveValue('potential')
  })

  it('Status offers exactly the CUSTOMER_STATUSES, in order', () => {
    renderForm()
    const options = within(field('Status')).getAllByRole('option')
    expect(options.map(o => o.value)).toEqual(CUSTOMER_STATUSES)
  })

  it('Status has no blank option (the server rejects "")', () => {
    renderForm()
    const values = within(field('Status')).getAllByRole('option').map(o => o.value)
    expect(values).not.toContain('')
  })

  it.each([
    ['Birthday', 'date'],
    ['Phone', 'tel'],
    ['Email', 'email'],
  ])('%s is an input of type "%s"', (label, type) => {
    renderForm()
    expect(field(label)).toHaveAttribute('type', type)
  })

  it('has a "Create Customer" submit button', () => {
    renderForm()
    expect(submitButton()).toHaveAttribute('type', 'submit')
  })
})

describe('CustomerForm: controlled inputs', () => {
  it.each([
    ['First name', 'Ana'],
    ['Last name', 'Diaz'],
    ['Birthday', '1990-05-17'],
    ['Phone', '5551234567'],
    ['Email', 'ana@example.com'],
    ['Address', '12 Main St'],
  ])('typing in "%s" updates its value', (label, value) => {
    renderForm()
    change(label, value)
    expect(field(label)).toHaveValue(value)
  })

  it.each(TEXT_FIELDS)('"%s" is controlled by state (has a value prop)', label => {
    //React mirrors a controlled input's value into its HTML attribute; an uncontrolled input has none
    renderForm()
    change(label, '1990-05-17')
    expect(field(label)).toHaveAttribute('value', '1990-05-17')
  })

  it('choosing a status updates the select', () => {
    renderForm()
    change('Status', 'inactive')
    expect(field('Status')).toHaveValue('inactive')
  })

  it('typing in one field leaves the others alone', () => {
    //A handler that sets formData to just the changed field wipes the rest
    renderForm()
    change('First name', 'Ana')
    change('Last name', 'Diaz')
    expect(field('First name')).toHaveValue('Ana')
    expect(field('Last name')).toHaveValue('Diaz')
    expect(field('Status')).toHaveValue('potential')
  })

  it('logs no React warnings while typing (no uncontrolled → controlled switch)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderForm()
    for (const label of TEXT_FIELDS) change(label, 'x')
    change('Status', 'client')
    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('CustomerForm: submitting', () => {
  it('calls onSubmit once with every field, using the server\'s key names', () => {
    const onSubmit = renderForm()
    change('First name', 'Ana')
    change('Last name', 'Diaz')
    change('Status', 'client')
    change('Birthday', '1990-05-17')
    change('Phone', '5551234567')
    change('Email', 'ana@example.com')
    change('Address', '12 Main St')
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({
      first_name: 'Ana', last_name: 'Diaz', status: 'client',
      birthday: '1990-05-17', phone: '5551234567', email: 'ana@example.com', address: '12 Main St',
    })
  })

  it('submits a blank form as empty strings with status "potential"', () => {
    //The server turns "" into null, so the form doesn't strip anything
    const onSubmit = renderForm()
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledWith(EMPTY)
  })

  it('lets an invalid email through so the server can answer (noValidate)', () => {
    const onSubmit = renderForm()
    change('First name', 'Ana')
    change('Email', 'bob@')
    fireEvent.click(submitButton())
    expect(onSubmit).toHaveBeenCalledWith({ ...EMPTY, first_name: 'Ana', email: 'bob@' })
  })

  it('turns off browser validation on the form', () => {
    renderForm()
    expect(submitButton().closest('form')).toHaveAttribute('novalidate')
  })

  it('prevents the page reload', () => {
    renderForm()
    //fireEvent returns false when the handler called preventDefault()
    expect(fireEvent.submit(submitButton().closest('form'))).toBe(false)
  })

  it('keeps the typed values after submitting (so a server error doesn\'t wipe them)', () => {
    renderForm()
    change('First name', 'Ana')
    change('Email', 'bob@')
    fireEvent.click(submitButton())
    expect(field('First name')).toHaveValue('Ana')
    expect(field('Email')).toHaveValue('bob@')
  })

  it('does not fetch; the page decides what happens', () => {
    renderForm()
    change('First name', 'Ana')
    fireEvent.click(submitButton())
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
