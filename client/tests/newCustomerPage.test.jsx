import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useParams } from 'react-router'
import { apiFetch } from '../src/api.js'
import NewCustomerPage from '../src/pages/NewCustomerPage.jsx'

//Day 2, Steps 9 and 10: the page POSTs what the form hands it, then navigates or shows the errors
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//CustomerForm is tested on its own (Block C). The marker submits fixed data, and its
//uncontrolled "draft" input reveals whether the page threw the form away and rebuilt it
vi.mock('../src/components/newCustomer/CustomerForm.jsx', () => ({
  default: ({ onSubmit }) => (
    <div>
      <label htmlFor="draft">Draft</label>
      <input id="draft" />
      <button type="button" onClick={() => onSubmit(FORM_DATA)}>Fake submit</button>
    </div>
  ),
}))

const FORM_DATA = {
  first_name: 'Ana', last_name: 'Diaz', status: 'client',
  birthday: '1990-05-17', phone: '5551234567', email: 'ana@example.com', address: '12 Main St',
}

const CREATED = {
  id: 42, first_name: 'Ana', last_name: 'Diaz', full_name: 'Ana Diaz', status: 'client',
  birthday: '1990-05-17', phone: '(555) 123-4567', email: 'ana@example.com', address: '12 Main St',
}

beforeEach(() => {
  apiFetch.mockReset()
})

function CustomerMarker() {
  return <p>Customer page {useParams().id}</p>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/customers/new']}>
      <Routes>
        <Route path="/customers/new" element={<NewCustomerPage />} />
        <Route path="/customers/:id" element={<CustomerMarker />} />
      </Routes>
    </MemoryRouter>,
  )
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Fake submit' }))
}

//Lets the awaited apiFetch resolve and React re-render
async function flush() {
  await act(async () => {})
}

//A promise the test settles by hand, to look at the page mid-request
function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

describe('NewCustomerPage: rendering', () => {
  it('shows the heading and the form', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'New Customer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fake submit' })).toBeInTheDocument()
  })

  it('shows no errors before anything is submitted', () => {
    renderPage()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe('NewCustomerPage: the request', () => {
  it('POSTs to /customers once', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 201, data: CREATED })
    renderPage()
    submit()
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers')
    expect(options.method).toBe('POST')
  })

  it('sends the form data as the JSON body, unchanged', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 201, data: CREATED })
    renderPage()
    submit()
    await flush()
    const [, options] = apiFetch.mock.calls[0]
    expect(typeof options.body).toBe('string')
    expect(JSON.parse(options.body)).toEqual(FORM_DATA)
  })
})

describe('NewCustomerPage: success', () => {
  it('goes to the new customer\'s page (201 counts as success)', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 201, data: CREATED })
    renderPage()
    submit()
    expect(await screen.findByText('Customer page 42')).toBeInTheDocument()
  })

  it('uses the id the server returns', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 201, data: { ...CREATED, id: 7 } })
    renderPage()
    submit()
    expect(await screen.findByText('Customer page 7')).toBeInTheDocument()
  })

  it('waits for the response before navigating', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    renderPage()
    submit()
    await flush()
    expect(screen.getByRole('heading', { name: 'New Customer' })).toBeInTheDocument()
    expect(screen.queryByText(/Customer page/)).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
    expect(screen.getByText('Customer page 42')).toBeInTheDocument()
  })
})

describe('NewCustomerPage: errors', () => {
  it.each([
    ['a blank name', 400, { error: 'First Name cannot be left empty' }, 'First Name cannot be left empty'],
    ['a bad email', 400, { errors: { email: ['Not a valid email address.'] } }, 'email: Not a valid email address.'],
    ['a bad phone', 400, { error: 'Phone number must have 10 digits' }, 'Phone number must have 10 digits'],
    ['a duplicate email', 409, { error: 'Email already in use' }, 'Email already in use'],
  ])('shows the server message for %s and stays on the page', async (_case, status, data, message) => {
    apiFetch.mockResolvedValue({ ok: false, status, data })
    renderPage()
    submit()
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'New Customer' })).toBeInTheDocument()
    expect(screen.queryByText(/Customer page/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the error has no body', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 500, data: null })
    renderPage()
    submit()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('keeps the form (and what was typed) on screen after an error', async () => {
    apiFetch.mockResolvedValue({ ok: false, status: 409, data: { error: 'Email already in use' } })
    renderPage()
    fireEvent.change(screen.getByLabelText('Draft'), { target: { value: 'still here' } })
    submit()
    await screen.findByText('Email already in use')
    expect(screen.getByLabelText('Draft')).toHaveValue('still here')
  })

  it('clears the old error as soon as you resubmit', async () => {
    apiFetch.mockResolvedValueOnce({ ok: false, status: 409, data: { error: 'Email already in use' } })
    renderPage()
    submit()
    await screen.findByText('Email already in use')

    const retry = deferred()
    apiFetch.mockReturnValueOnce(retry.promise)
    submit()
    await flush()
    expect(screen.queryByText('Email already in use')).not.toBeInTheDocument()

    await act(async () => retry.resolve({ ok: false, status: 400, data: { error: 'Phone number must have 10 digits' } }))
    expect(screen.getByText('Phone number must have 10 digits')).toBeInTheDocument()
    expect(screen.queryByText('Email already in use')).not.toBeInTheDocument()
  })

  it('can still succeed after an error', async () => {
    apiFetch
      .mockResolvedValueOnce({ ok: false, status: 409, data: { error: 'Email already in use' } })
      .mockResolvedValueOnce({ ok: true, status: 201, data: CREATED })
    renderPage()
    submit()
    await screen.findByText('Email already in use')
    submit()
    expect(await screen.findByText('Customer page 42')).toBeInTheDocument()
  })
})
