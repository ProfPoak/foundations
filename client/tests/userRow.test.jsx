import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import { useAuth } from '../src/context/AuthContext.jsx'
import UserRow from '../src/components/admin/UserRow.jsx'

//Day 5, Step 14: UserRow shows one user with an Admin badge for admins, and a Delete button on
//every row but your own. It sends DELETE /users/:id itself and hands the id up when it works
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

//The logged-in admin. Only admins can reach this page
const ME = { id: 1, username: 'admin', is_admin: true }

const EMPLOYEE = { id: 7, username: 'tasha44', is_admin: false }
const OTHER_ADMIN = { id: 4, username: 'manager', is_admin: true }

beforeEach(() => {
  apiFetch.mockReset()
  useAuth.mockReturnValue({ user: ME })
})

function renderRow(user = EMPLOYEE) {
  const onDeleteUser = vi.fn()
  render(<ul><UserRow user={user} onDeleteUser={onDeleteUser} /></ul>)
  return onDeleteUser
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

//The row's own <li>. ErrorMessage adds <li>s of its own inside it, so take the outermost
function row() {
  return screen.getAllByRole('listitem')[0]
}

function deleteButton() {
  return screen.queryByRole('button', { name: 'Delete' })
}

async function flush() {
  await act(async () => {})
}

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

describe('UserRow: display', () => {
  it('renders a single list item', () => {
    renderRow()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows the username', () => {
    renderRow()
    expect(row()).toHaveTextContent('tasha44')
  })

  it('shows an "Admin" badge for an admin', () => {
    renderRow(OTHER_ADMIN)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('shows no "Admin" badge for a non-admin', () => {
    renderRow()
    expect(row().textContent).not.toMatch(/Admin/)
  })

  it('never shows "true", "false" or the id', () => {
    renderRow()
    expect(row().textContent).not.toMatch(/true|false|7/)
  })

  it('makes no request just by rendering', () => {
    const onDeleteUser = renderRow()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onDeleteUser).not.toHaveBeenCalled()
  })
})

describe('UserRow: who gets a Delete button', () => {
  it('shows Delete on another user\'s row', () => {
    renderRow()
    expect(deleteButton()).toBeInTheDocument()
    expect(deleteButton()).toHaveAttribute('type', 'button')
  })

  it('shows Delete on another admin\'s row', () => {
    renderRow(OTHER_ADMIN)
    expect(deleteButton()).toBeInTheDocument()
  })

  it('hides Delete on your own row', () => {
    renderRow(ME)
    expect(deleteButton()).not.toBeInTheDocument()
  })

  it('compares ids, not usernames or admin status', () => {
    //Your id with a different name is still you
    renderRow({ id: 1, username: 'renamed', is_admin: true })
    expect(deleteButton()).not.toBeInTheDocument()
  })

  it('still shows your own username and badge', () => {
    renderRow(ME)
    expect(row()).toHaveTextContent('admin')
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})

describe('UserRow: deleting', () => {
  it('sends DELETE /users/:id', async () => {
    respond(true, 204, null)
    renderRow()
    fireEvent.click(deleteButton())
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/users/7')
    expect(options.method).toBe('DELETE')
  })

  it('calls onDeleteUser with the user id when it works (204 has no body)', async () => {
    respond(true, 204, null)
    const onDeleteUser = renderRow()
    fireEvent.click(deleteButton())
    await flush()
    expect(onDeleteUser).toHaveBeenCalledTimes(1)
    expect(onDeleteUser).toHaveBeenCalledWith(7)
  })

  it('does not call onDeleteUser before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const onDeleteUser = renderRow()
    fireEvent.click(deleteButton())
    await flush()
    expect(onDeleteUser).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 204, data: null }))
    expect(onDeleteUser).toHaveBeenCalledTimes(1)
  })

  it('shows no "Something went wrong" after a successful delete', async () => {
    respond(true, 204, null)
    renderRow()
    fireEvent.click(deleteButton())
    await flush()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})

describe('UserRow: a refused delete', () => {
  it('shows the 409 message for a user with a history, and keeps the row', async () => {
    respond(false, 409, { error: "User's with a history cannot be deleted" })
    const onDeleteUser = renderRow()
    fireEvent.click(deleteButton())
    expect(await screen.findByText("User's with a history cannot be deleted")).toBeInTheDocument()
    expect(onDeleteUser).not.toHaveBeenCalled()
    expect(row()).toHaveTextContent('tasha44')
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderRow()
    fireEvent.click(deleteButton())
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows the message inside the row', async () => {
    respond(false, 409, { error: "User's with a history cannot be deleted" })
    renderRow()
    fireEvent.click(deleteButton())
    const message = await screen.findByText("User's with a history cannot be deleted")
    expect(row()).toContainElement(message)
  })

  it('clears the old error as soon as you try again', async () => {
    respond(false, 409, { error: "User's with a history cannot be deleted" })
    renderRow()
    fireEvent.click(deleteButton())
    await screen.findByText("User's with a history cannot be deleted")

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    fireEvent.click(deleteButton())
    await flush()
    expect(screen.queryByText("User's with a history cannot be deleted")).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 204, data: null }))
  })
})
