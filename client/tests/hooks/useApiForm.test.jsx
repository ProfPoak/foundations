import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { apiFetch } from '../src/services/api.js'
import { useApiForm } from '../src/hooks/useApiForm.js'

//Shared by every form that sends its own request (EventForm, CustomerDetails, NoteForm,
//NoteItem's edit, TaskForm): formData, handleChange, and a submit that handles ok / errors
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))

const INITIAL = { interaction: 'call', notes: '' }
const CREATED = { id: 50, interaction: 'meeting', notes: 'Hi' }

beforeEach(() => {
  apiFetch.mockReset()
})

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

function renderForm(options = {}) {
  const onSuccess = vi.fn()
  const view = renderHook(props => useApiForm(props), {
    initialProps: { initial: INITIAL, path: '/customers/7/events', method: 'POST', onSuccess, ...options },
  })
  return { ...view, onSuccess }
}

function change(result, name, value) {
  act(() => result.current.handleChange({ target: { name, value } }))
}

//A stand-in for the browser's submit event
function submitEvent() {
  return { preventDefault: vi.fn() }
}

async function submit(result, event = submitEvent()) {
  await act(() => result.current.handleSubmit(event))
  return event
}

describe('useApiForm: form state', () => {
  it('starts with the initial formData and no errors', () => {
    const { result } = renderForm()
    expect(result.current.formData).toEqual(INITIAL)
    expect(result.current.errors).toBeNull()
  })

  it('handleChange sets the field named by the input, keeping the others', () => {
    const { result } = renderForm()
    change(result, 'notes', 'Hi')
    expect(result.current.formData).toEqual({ interaction: 'call', notes: 'Hi' })
  })

  it('handleChange twice in a row keeps both changes', () => {
    //Building from a stale copy of formData would drop the first change
    const { result } = renderForm()
    act(() => {
      result.current.handleChange({ target: { name: 'interaction', value: 'meeting' } })
      result.current.handleChange({ target: { name: 'notes', value: 'Hi' } })
    })
    expect(result.current.formData).toEqual({ interaction: 'meeting', notes: 'Hi' })
  })

  it('never changes the initial object', () => {
    const initial = { ...INITIAL }
    const { result } = renderForm({ initial })
    change(result, 'notes', 'Hi')
    expect(initial).toEqual(INITIAL)
  })

  it('exposes setFormData and setErrors for forms that fill or clear them (e.g. edit mode)', () => {
    const { result } = renderForm({ initial: null })
    act(() => result.current.setFormData({ content: 'Existing' }))
    act(() => result.current.setErrors({ error: 'x' }))
    expect(result.current.formData).toEqual({ content: 'Existing' })
    expect(result.current.errors).toEqual({ error: 'x' })
  })
})

describe('useApiForm: submitting', () => {
  it('prevents the page reload', async () => {
    respond(true, 201, CREATED)
    const { result } = renderForm()
    const event = await submit(result)
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('sends formData as JSON to the path, with the method', async () => {
    respond(true, 201, CREATED)
    const { result } = renderForm()
    change(result, 'notes', 'Hi')
    await submit(result)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers/7/events')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ interaction: 'call', notes: 'Hi' })
  })

  it('uses the latest path and method', async () => {
    //CustomerDetails builds its path from the customer prop, which can change
    respond(true, 200, CREATED)
    const { result, rerender, onSuccess } = renderForm()
    rerender({ initial: INITIAL, path: '/customers/8', method: 'PATCH', onSuccess })
    await submit(result)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers/8')
    expect(options.method).toBe('PATCH')
  })

  it('calls onSuccess once with the server\'s data', async () => {
    respond(true, 201, CREATED)
    const { result, onSuccess } = renderForm()
    await submit(result)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledWith(CREATED)
  })

  it('keeps formData after success by default (edit forms)', async () => {
    respond(true, 200, CREATED)
    const { result } = renderForm()
    change(result, 'notes', 'Hi')
    await submit(result)
    expect(result.current.formData).toEqual({ interaction: 'call', notes: 'Hi' })
  })

  it('resets formData after success when resetOnSuccess is true (add forms)', async () => {
    respond(true, 201, CREATED)
    const { result } = renderForm({ resetOnSuccess: true })
    change(result, 'notes', 'Hi')
    await submit(result)
    expect(result.current.formData).toEqual(INITIAL)
  })
})

describe('useApiForm: errors', () => {
  it('stores the error body and does not call onSuccess', async () => {
    respond(false, 400, { error: 'Content cannot be left empty' })
    const { result, onSuccess } = renderForm()
    await submit(result)
    expect(result.current.errors).toEqual({ error: 'Content cannot be left empty' })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('stores {} when the failure has no body, so ErrorMessage shows "Something went wrong"', async () => {
    respond(false, 500, null)
    const { result } = renderForm()
    await submit(result)
    expect(result.current.errors).toEqual({})
  })

  it('keeps formData on failure, even with resetOnSuccess', async () => {
    respond(false, 400, { error: 'Nope' })
    const { result } = renderForm({ resetOnSuccess: true })
    change(result, 'notes', 'Keep me')
    await submit(result)
    expect(result.current.formData).toEqual({ interaction: 'call', notes: 'Keep me' })
  })

  it('clears the old error as soon as a new submit starts', async () => {
    respond(false, 400, { error: 'Nope' })
    const { result } = renderForm()
    await submit(result)

    let resolve
    apiFetch.mockReturnValue(new Promise(r => { resolve = r }))
    let pending
    act(() => { pending = result.current.handleSubmit(submitEvent()) })
    expect(result.current.errors).toBeNull()
    await act(async () => { resolve({ ok: true, status: 201, data: CREATED }); await pending })
  })
})
