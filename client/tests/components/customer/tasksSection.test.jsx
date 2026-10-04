import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import { apiFetch } from '../../../src/services/api.js'
import TasksSection from '../../../src/components/customer/TasksSection.jsx'

//Day 5, Steps 1–3: TasksSection loads the customer's tasks and the user list once each,
//and lists the tasks in the order the server sent them
vi.mock('../../../src/services/api.js', () => ({ apiFetch: vi.fn() }))
//TaskItem is tested on its own. The marker shows which task it received
vi.mock('../../../src/components/customer/TaskItem.jsx', () => ({
  default: ({ task }) => <li>Task {task.id}</li>,
}))
//TaskForm is Block B. The marker only shows where it renders
vi.mock('../../../src/components/customer/TaskForm.jsx', () => ({
  default: () => <p>TaskForm marker</p>,
}))

function makeTask(id, due_date) {
  return {
    id, title: `Task title ${id}`, status: 'open', due_date, notes: null,
    employee_id: 1, customer_id: 7,
    employee: { id: 1, username: 'admin', is_admin: true },
  }
}

//Sorted by due date, as the server sends them. Ids are deliberately out of order,
//so sorting by id (or re-sorting at all) changes the result
const TASKS = [
  makeTask(12, null),
  makeTask(30, '2026-10-05'),
  makeTask(5, '2026-11-20'),
]

const USERS = [
  { id: 1, username: 'admin', is_admin: true },
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

//The section makes two requests, so answer each by its path.
//A response of null leaves that request pending forever
function respond({ tasks = { ok: true, status: 200, data: TASKS }, users = { ok: true, status: 200, data: USERS } } = {}) {
  apiFetch.mockImplementation(path => {
    const response = path === '/users' ? users : tasks
    return response === null ? new Promise(() => {}) : Promise.resolve(response)
  })
}

function renderSection(customerId = '7') {
  return render(<TasksSection customerId={customerId} />)
}

async function renderLoaded(tasks = TASKS) {
  respond({ tasks: { ok: true, status: 200, data: tasks } })
  const view = renderSection()
  await screen.findByText(tasks.length ? `Task ${tasks[0].id}` : 'No tasks yet')
  return view
}

function shownIds() {
  return screen.queryAllByText(/^Task \d+$/).map(li => li.textContent)
}

function callsTo(path) {
  return apiFetch.mock.calls.filter(([p]) => p === path)
}

describe('TasksSection: loading the tasks', () => {
  it('shows the Tasks heading and Loading while the request is pending', () => {
    respond({ tasks: null, users: null })
    renderSection()
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument()
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
  })

  it('requests GET /customers/:customerId/tasks', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/customers/7/tasks')
  })

  it('requests the tasks only once', async () => {
    //A missing dependency array refetches after every render
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(callsTo('/customers/7/tasks')).toHaveLength(1)
  })

  it('renders one TaskItem per task, in the order the server sent them', async () => {
    await renderLoaded()
    expect(shownIds()).toEqual(['Task 12', 'Task 30', 'Task 5'])
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('puts the TaskItems inside a <ul>', async () => {
    await renderLoaded()
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
  })

  it('keeps the heading after loading', async () => {
    await renderLoaded()
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument()
  })

  it('shows "No tasks yet" when the customer has none', async () => {
    await renderLoaded([])
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    expect(shownIds()).toEqual([])
  })

  it('does not show "No tasks yet" when there are tasks', async () => {
    await renderLoaded()
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
  })
})

describe('TasksSection: loading the users', () => {
  it('requests GET /users', async () => {
    await renderLoaded()
    expect(apiFetch).toHaveBeenCalledWith('/users')
  })

  it('requests the users only once', async () => {
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(callsTo('/users')).toHaveLength(1)
  })

  it('makes no other requests', async () => {
    await renderLoaded()
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })

  it('shows the tasks without waiting for the users', async () => {
    //There's no loading flag for users: the list shouldn't depend on them
    respond({ users: null })
    renderSection()
    expect(await screen.findByText('Task 12')).toBeInTheDocument()
  })

  it('shows the error when the users fail to load, and still lists the tasks', async () => {
    respond({ users: { ok: false, status: 500, data: { error: 'Users exploded' } } })
    renderSection()
    expect(await screen.findByText('Users exploded')).toBeInTheDocument()
    expect(await screen.findByText('Task 12')).toBeInTheDocument()
    expect(shownIds()).toEqual(['Task 12', 'Task 30', 'Task 5'])
  })

  it('shows "Something went wrong" when the users fail with no body', async () => {
    respond({ users: { ok: false, status: 500, data: null } })
    renderSection()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows no error while the users load fine', async () => {
    await renderLoaded()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})

describe('TasksSection: the form', () => {
  it('renders TaskForm while loading', () => {
    respond({ tasks: null, users: null })
    renderSection()
    expect(screen.getByText('TaskForm marker')).toBeInTheDocument()
  })

  it('renders TaskForm once loaded, even with no tasks', async () => {
    await renderLoaded([])
    expect(screen.getByText('TaskForm marker')).toBeInTheDocument()
  })
})

describe('TasksSection: a failed task request', () => {
  it('shows the server error, keeps the heading, and stops loading', async () => {
    respond({ tasks: { ok: false, status: 500, data: { error: 'Server exploded' } } })
    renderSection()
    expect(await screen.findByText('Server exploded')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond({ tasks: { ok: false, status: 500, data: null } })
    renderSection()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('does not claim there are no tasks when the request failed', async () => {
    respond({ tasks: { ok: false, status: 500, data: { error: 'Server exploded' } } })
    renderSection()
    await screen.findByText('Server exploded')
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
  })
})

describe('TasksSection: changing customer', () => {
  it('loads the new customer\'s tasks when customerId changes', async () => {
    //With [] instead of [customerId], the old customer's tasks stay
    const { rerender } = await renderLoaded()
    respond({ tasks: { ok: true, status: 200, data: [makeTask(99, null)] } })
    rerender(<TasksSection customerId="8" />)
    expect(await screen.findByText('Task 99')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/customers/8/tasks')
  })
})
