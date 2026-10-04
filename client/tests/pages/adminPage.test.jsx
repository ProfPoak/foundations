import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../src/services/api.js'
import AdminPage from '../src/pages/AdminPage.jsx'

//Day 5, Steps 12–13: AdminPage loads every user once, lists them in the server's order,
//and drops a row when UserRow reports a delete, without refetching
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))
//UserRow is tested on its own. The marker remembers the user id it was first created with
//(so key={index} shows up after a delete), and its button acts like a successful delete
vi.mock('../src/components/admin/UserRow.jsx', () => ({
  default: function UserRowMarker({ user, onDeleteUser }) {
    const [firstId] = useState(user.id)
    return (
      <li>
        <span>User {user.id} (created for {firstId})</span>
        <button type="button" onClick={() => onDeleteUser(user.id)}>Fake delete {user.id}</button>
      </li>
    )
  },
}))

//Sorted by username, as the server sends them. Ids are deliberately out of order,
//so sorting by id (or re-sorting at all) changes the result
const USERS = [
  { id: 1, username: 'admin', is_admin: true },
  { id: 9, username: 'douglasmoore', is_admin: false },
  { id: 6, username: 'tasha44', is_admin: false },
]

//Catches a missing or duplicate key on the list items; other errors pass through
let keyWarnings
beforeEach(() => {
  apiFetch.mockReset()
  keyWarnings = []
  const original = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args.map(String).join(' ')
    if (/unique "key"|same key/i.test(message)) keyWarnings.push(message)
    else original(...args)
  })
})

afterEach(() => {
  expect(keyWarnings, 'React warned about list keys').toEqual([])
})

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

async function renderLoaded(users = USERS) {
  respond(true, 200, users)
  render(<AdminPage />)
  if (users.length) await screen.findAllByText(/^User \d+/)
  else await screen.findByText('No users')
}

function shownIds() {
  return screen.queryAllByText(/^User \d+/).map(span => Number(span.textContent.match(/^User (\d+)/)[1]))
}

function heading() {
  return screen.getByRole('heading', { level: 1, name: 'Admin Portal' })
}

describe('AdminPage: loading the users (Step 12)', () => {
  it('shows the heading and Loading while the request is pending', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    render(<AdminPage />)
    expect(heading()).toBeInTheDocument()
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expect(screen.queryByText('No users')).not.toBeInTheDocument()
  })

  it('requests GET /users', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/users')
  })

  it('requests the users only once', async () => {
    //A missing dependency array refetches after every render
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})

describe('AdminPage: the list (Step 13)', () => {
  it('renders one UserRow per user, in the order the server sent them', async () => {
    await renderLoaded()
    expect(shownIds()).toEqual([1, 9, 6])
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('puts the UserRows inside a <ul>', async () => {
    await renderLoaded()
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('keeps the heading after loading', async () => {
    await renderLoaded()
    expect(heading()).toBeInTheDocument()
  })

  it('shows "No users" when there are none', async () => {
    await renderLoaded([])
    expect(screen.getByText('No users')).toBeInTheDocument()
    expect(shownIds()).toEqual([])
  })

  it('does not show "No users" when there are users', async () => {
    await renderLoaded()
    expect(screen.queryByText('No users')).not.toBeInTheDocument()
  })
})

describe('AdminPage: a failed request', () => {
  it('shows the server error, keeps the heading, and stops loading', async () => {
    respond(false, 500, { error: 'Server exploded' })
    render(<AdminPage />)
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(heading()).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    render(<AdminPage />)
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('does not claim there are no users when the request failed', async () => {
    respond(false, 500, { error: 'Server exploded' })
    render(<AdminPage />)
    await screen.findByText('Server exploded')
    expect(screen.queryByText('No users')).not.toBeInTheDocument()
  })
})

describe('AdminPage: deleting a user', () => {
  it('removes only that row', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 9' }))
    expect(shownIds()).toEqual([1, 6])
  })

  it('keys each row by user id, so every row stays matched to its own user', async () => {
    //key={index} hands user 9's row to user 6 after user 9 is removed
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 9' }))
    for (const span of screen.getAllByText(/^User \d+/)) {
      const [, id, firstId] = span.textContent.match(/^User (\d+) \(created for (\d+)\)$/)
      expect(firstId, span.textContent).toBe(id)
    }
  })

  it('handles two deletes in a row', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 6' }))
    expect(shownIds()).toEqual([1])
  })

  it('shows "No users" after the last row is deleted', async () => {
    await renderLoaded([USERS[1]])
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 9' }))
    expect(screen.getByText('No users')).toBeInTheDocument()
  })

  it('does not request the users again', async () => {
    await renderLoaded()
    fireEvent.click(screen.getByRole('button', { name: 'Fake delete 9' }))
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })
})
