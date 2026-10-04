import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../src/services/api.js'
import TasksSection from '../src/components/customer/TasksSection.jsx'

//Day 5, Step 7: TasksSection passes customerId, users and onAddTask to TaskForm,
//and puts each created task at the top of the list without refetching
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))
//The marker remembers the task id it was first created with. If the list uses the array
//index as the key, React reuses the old item for the new task, and the two ids disagree
vi.mock('../src/components/customer/TaskItem.jsx', () => ({
  default: function TaskItemMarker({ task }) {
    const [firstId] = useState(task.id)
    return <li>Task {task.id} (created for {firstId})</li>
  },
}))
//The marker shows the customerId and usernames it got, and its buttons hand a new task to onAddTask
vi.mock('../src/components/customer/TaskForm.jsx', () => ({
  default: ({ customerId, users, onAddTask }) => (
    <div>
      <p>TaskForm for {customerId}</p>
      <p>Users: {(users ?? []).map(u => u.username).join(', ') || 'none'}</p>
      <button type="button" onClick={() => onAddTask(makeTask(101))}>Fake add 101</button>
      <button type="button" onClick={() => onAddTask(makeTask(102))}>Fake add 102</button>
    </div>
  ),
}))

function makeTask(id) {
  return {
    id, title: `Task title ${id}`, status: 'open', due_date: '2026-10-05', notes: null,
    employee_id: 1, customer_id: 7, employee: { id: 1, username: 'admin', is_admin: true },
  }
}

const TASKS = [makeTask(12), makeTask(5)]

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
  await screen.findByText(tasks.length ? /^Task 12/ : 'No tasks yet')
  await screen.findByText('Users: admin, tasha44')
}

function add(id) {
  fireEvent.click(screen.getByRole('button', { name: `Fake add ${id}` }))
}

function shownIds() {
  return screen.queryAllByText(/^Task \d+/).map(li => Number(li.textContent.match(/^Task (\d+)/)[1]))
}

describe('TasksSection: wiring up TaskForm', () => {
  it('passes the customerId to TaskForm', async () => {
    await renderLoaded()
    expect(screen.getByText('TaskForm for 7')).toBeInTheDocument()
  })

  it('passes the loaded users to TaskForm', async () => {
    await renderLoaded()
    expect(screen.getByText('Users: admin, tasha44')).toBeInTheDocument()
  })
})

describe('TasksSection: adding a task', () => {
  it('puts the new task at the top of the list', async () => {
    await renderLoaded()
    add(101)
    expect(shownIds()).toEqual([101, 12, 5])
  })

  it('keeps putting newer tasks on top', async () => {
    await renderLoaded()
    add(101)
    add(102)
    expect(shownIds()).toEqual([102, 101, 12, 5])
  })

  it('keys each item by task id, so every item stays matched to its own task', async () => {
    //key={index} hands the new task to the item that used to be at index 0
    await renderLoaded()
    add(101)
    for (const li of screen.getAllByText(/^Task \d+/)) {
      const [, id, firstId] = li.textContent.match(/^Task (\d+) \(created for (\d+)\)$/)
      expect(firstId, li.textContent).toBe(id)
    }
  })

  it('replaces "No tasks yet" with the first task', async () => {
    await renderLoaded([])
    add(101)
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument()
    expect(shownIds()).toEqual([101])
  })

  it('does not request the tasks or users again', async () => {
    //The created task comes from the server already, so there's nothing to refetch
    await renderLoaded()
    add(101)
    await act(() => new Promise(r => setTimeout(r, 50)))
    expect(apiFetch).toHaveBeenCalledTimes(2)
  })
})
