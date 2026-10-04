import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { apiFetch } from '../src/services/api.js'
import { useCustomerList } from '../src/hooks/useCustomerList.js'

//Shared by EventsSection, NotesSection (and TasksSection on Day 5): loads one of a customer's
//lists and keeps it in sync after add / update / remove, without refetching
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))

const ITEMS = [
  { id: 12, content: 'newest' },
  { id: 30, content: 'middle' },
  { id: 5, content: 'oldest' },
]

beforeEach(() => {
  apiFetch.mockReset()
})

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

async function renderLoaded(items = ITEMS, customerId = '7', resource = 'notes') {
  respond(true, 200, items)
  const view = renderHook(({ id, res }) => useCustomerList(id, res), {
    initialProps: { id: customerId, res: resource },
  })
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

function ids(result) {
  return result.current.items.map(item => item.id)
}

describe('useCustomerList: loading', () => {
  it('starts loading with an empty list and no errors', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useCustomerList('7', 'events'))
    expect(result.current.loading).toBe(true)
    expect(result.current.items).toEqual([])
    expect(result.current.errors).toBeNull()
  })

  it('requests /customers/:customerId/:resource', async () => {
    await renderLoaded(ITEMS, '7', 'events')
    expect(apiFetch).toHaveBeenCalledWith('/customers/7/events')
  })

  it('stores the list in the server\'s order', async () => {
    const { result } = await renderLoaded()
    expect(ids(result)).toEqual([12, 30, 5])
    expect(result.current.errors).toBeNull()
  })

  it('requests only once', async () => {
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('stores the error body on failure, and {} when there is none', async () => {
    respond(false, 500, { error: 'Server exploded' })
    const failed = renderHook(() => useCustomerList('7', 'notes'))
    await waitFor(() => expect(failed.result.current.loading).toBe(false))
    expect(failed.result.current.errors).toEqual({ error: 'Server exploded' })
    expect(failed.result.current.items).toEqual([])

    respond(false, 500, null)
    const empty = renderHook(() => useCustomerList('7', 'notes'))
    await waitFor(() => expect(empty.result.current.loading).toBe(false))
    expect(empty.result.current.errors).toEqual({})
  })

  it('loads again when the customerId changes', async () => {
    const { result, rerender } = await renderLoaded()
    respond(true, 200, [{ id: 99, content: 'other customer' }])
    rerender({ id: '8', res: 'notes' })
    await waitFor(() => expect(ids(result)).toEqual([99]))
    expect(apiFetch).toHaveBeenLastCalledWith('/customers/8/notes')
  })
})

describe('useCustomerList: keeping the list in sync', () => {
  it('addItem puts the new item first', async () => {
    const { result } = await renderLoaded()
    act(() => result.current.addItem({ id: 101, content: 'brand new' }))
    expect(ids(result)).toEqual([101, 12, 30, 5])
  })

  it('addItem twice in a row keeps both', async () => {
    //Building the new list from a stale copy would drop the first add
    const { result } = await renderLoaded()
    act(() => {
      result.current.addItem({ id: 101, content: 'first' })
      result.current.addItem({ id: 102, content: 'second' })
    })
    expect(ids(result)).toEqual([102, 101, 12, 30, 5])
  })

  it('updateItem replaces the item with the same id, in place', async () => {
    const { result } = await renderLoaded()
    act(() => result.current.updateItem({ id: 30, content: 'edited' }))
    expect(ids(result)).toEqual([12, 30, 5])
    expect(result.current.items[1]).toEqual({ id: 30, content: 'edited' })
    expect(result.current.items[0]).toBe(ITEMS[0])
  })

  it('removeItem drops the item with that id', async () => {
    const { result } = await renderLoaded()
    act(() => result.current.removeItem(30))
    expect(ids(result)).toEqual([12, 5])
  })

  it('never changes the array it was given (it makes new ones)', async () => {
    const original = [...ITEMS]
    const { result } = await renderLoaded(original)
    act(() => result.current.addItem({ id: 101 }))
    act(() => result.current.removeItem(12))
    expect(original.map(item => item.id)).toEqual([12, 30, 5])
  })

  it('makes no requests when the list changes', async () => {
    const { result } = await renderLoaded()
    act(() => {
      result.current.addItem({ id: 101 })
      result.current.updateItem({ id: 30, content: 'edited' })
      result.current.removeItem(5)
    })
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
