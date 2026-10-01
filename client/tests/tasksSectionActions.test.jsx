import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import TasksSection from '../src/components/customer/TasksSection.jsx'

//Day 5, Steps 8–11: TasksSection hands each TaskItem the users, onUpdateTask and onDeleteTask,
//and keeps the list in sync without refetching
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//The marker shows the usernames it got, and its buttons act like a successful change or delete
vi.mock('../src/components/customer/TaskItem.jsx', () => ({
  default: ({ task, users, onUpdateTask, onDeleteTask }) => (
    <li>
      <span>{task.title} ({task.status})</span>
      <em>Users: {(users ?? []).map(u => u.username).join(', ') || 'none'}</em>
      <button type="button" onClick={() => onUpdateTask({ ...task, status: 'complete' })}>
        Fake update {task.id}
      </button>
      <button type="button" onClick={() => onDeleteTask(task.id)}>
        Fake delete {task.id}
      </button>
    </li>
  ),
}))
vi.mock('../src/components/customer/TaskForm.jsx', () => ({
  default: () => <p>TaskForm marker</p>,
}))

function makeTask(id, title) {
  return {
    id, title, status: 'open', due_date: '2026-10-05', notes: null, employee_id: 1, customer_id: 7,
    employee: { id: 1, username: 'admin', is_admin: true },
  }
}

const TASKS = [makeTask(12, 'first'), makeTask(30, 'second'), makeTask(5, 'third')]

const USERS = [
  { id: 1, username: 'admin', is_admin: true },
  { id: 6, username: 'tasha44', is_admin: false },
]

beforeEach(() => {
  apiFetch.mockReset()
})

async function renderLoaded(tasks = TASKS) {
  apiFetch.mockImplementation(path => Promise.resolve(
    path === '/users'
      ? { ok: true, status: 200, data: USERS }
      : { ok: true, status: 200, data: tasks },
  ))
  render(<TasksSection customerId="7" />)
  await screen.findByText(`${tasks[0].title} (open)`)
}

function shownTasks() {
  return screen.getAllByRole('listitem').map(li => li.querySelector('span').textContent)
}

function click(name) {
  fireEvent.click(screen.getByRole('button', { name }))
}

describe('TasksSection: passing the users to each TaskItem', () => {
  it('hands every TaskItem the loaded users, for its Assignee dropdown', async () => {
    await renderLoaded()
    const lists = await screen.findAllByText('Users: admin, tasha44')
    expect(lists).toHaveLength(3)
  })
})

describe('TasksSection: updating a task', () => {
  it('replaces the updated task in the same spot', async () => {
    await renderLoaded()
    click('Fake update 30')
    expect(shownTasks()).toEqual(['first (open)', 'second (complete)', 'third (open)'])
  })

  it('leaves the other tasks alone', async () => {
    await renderLoaded()
    click('Fake update 12')
    expect(shownTasks()).toEqual(['first (complete)', 'second (open)', 'third (open)'])
  })
})

describe('TasksSection: deleting a task', () => {
  it('removes only that task', async () => {
    await renderLoaded()
    click('Fake delete 30')
    expect(shownTasks()).toEqual(['first (open)', 'third (open)'])
  })

  it('shows "No tasks yet" after the last task is deleted', async () => {
    await renderLoaded([makeTask(12, 'only one')])
    click('Fake delete 12')
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
  })
})

describe('TasksSection: no refetching', () => {
  it('does not request the tasks or users again after an update or a delete', async () => {
    await renderLoaded()
    click('Fake update 12')
    click('Fake delete 5')
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })
})
