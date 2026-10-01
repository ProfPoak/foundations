import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../src/api.js'
import { useAuth } from '../src/context/AuthContext.jsx'
import TaskItem from '../src/components/customer/TaskItem.jsx'

//Day 5, Steps 8–11: TaskItem shows the Status and Assignee dropdowns and Delete only to the
//assignee or an admin. Each dropdown PATCHes /tasks/:id with one key as soon as it changes,
//and Delete sends DELETE /tasks/:id
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const ASSIGNEE = { id: 6, username: 'tasha44', is_admin: false }
const ADMIN = { id: 1, username: 'admin', is_admin: true }
const OTHER = { id: 3, username: 'douglasmoore', is_admin: false }

const USERS = [ADMIN, OTHER, ASSIGNEE]

const TASK = {
  id: 4, title: 'Follow up call', status: 'in_progress', due_date: '2026-10-05',
  notes: null, employee_id: 6, customer_id: 1, employee: { ...ASSIGNEE },
}

//React logs each controlled/uncontrolled warning and key warning only once per run, so every test checks
let warnings
beforeEach(() => {
  apiFetch.mockReset()
  useAuth.mockReturnValue({ user: ASSIGNEE })
  warnings = []
  const original = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args.map(String).join(' ')
    if (/controlled|unique "key"|same key/i.test(message)) warnings.push(message)
    else original(...args)
  })
})

afterEach(() => {
  expect(warnings, 'React warned about a controlled input or a list key').toEqual([])
})

function loginAs(user) {
  useAuth.mockReturnValue({ user })
}

function renderItem(task = TASK) {
  const onUpdateTask = vi.fn()
  const onDeleteTask = vi.fn()
  const view = render(
    <ul><TaskItem task={task} users={USERS} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} /></ul>,
  )
  const rerender = next => view.rerender(
    <ul><TaskItem task={next} users={USERS} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} /></ul>,
  )
  return { ...view, rerender, onUpdateTask, onDeleteTask }
}

//Holds the task in state like TasksSection does, so onUpdateTask(data) re-renders the item
function Harness({ initial }) {
  const [task, setTask] = useState(initial)
  return (
    <ul>
      <TaskItem task={task} users={USERS} onUpdateTask={setTask} onDeleteTask={() => {}} />
    </ul>
  )
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

const statusSelect = () => screen.getByLabelText('Status')
const assigneeSelect = () => screen.getByLabelText('Assignee')
const queryStatus = () => screen.queryByLabelText('Status')
const queryAssignee = () => screen.queryByLabelText('Assignee')
const queryDelete = () => screen.queryByRole('button', { name: 'Delete' })

function change(select, value) {
  fireEvent.change(select, { target: { value } })
}

async function flush() {
  await act(async () => {})
}

function deferred() {
  let resolve
  const promise = new Promise(r => { resolve = r })
  return { promise, resolve }
}

function sentBody(call = 0) {
  return JSON.parse(apiFetch.mock.calls[call][1].body)
}

describe('TaskItem: who sees the controls (Step 8)', () => {
  it('shows both dropdowns and Delete to the assignee', () => {
    renderItem()
    expect(queryStatus()).toBeInTheDocument()
    expect(queryAssignee()).toBeInTheDocument()
    expect(queryDelete()).toBeInTheDocument()
  })

  it('shows them to an admin on someone else\'s task', () => {
    loginAs(ADMIN)
    renderItem()
    expect(queryStatus()).toBeInTheDocument()
    expect(queryAssignee()).toBeInTheDocument()
    expect(queryDelete()).toBeInTheDocument()
  })

  it('hides them from a non-admin who isn\'t the assignee', () => {
    loginAs(OTHER)
    renderItem()
    expect(queryStatus()).not.toBeInTheDocument()
    expect(queryAssignee()).not.toBeInTheDocument()
    expect(queryDelete()).not.toBeInTheDocument()
  })

  it('shows the status and assignee as text to someone who can\'t change them', () => {
    loginAs(OTHER)
    renderItem()
    const li = screen.getByRole('listitem')
    expect(li).toHaveTextContent('in_progress')
    expect(li).toHaveTextContent('tasha44')
  })

  it('compares ids, not usernames', () => {
    //Same username as the assignee, different id: still not the assignee
    loginAs({ id: 99, username: 'tasha44', is_admin: false })
    renderItem()
    expect(queryStatus()).not.toBeInTheDocument()
  })

  it('makes no request just by rendering', () => {
    const { onUpdateTask, onDeleteTask } = renderItem()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdateTask).not.toHaveBeenCalled()
    expect(onDeleteTask).not.toHaveBeenCalled()
  })
})

describe('TaskItem: the Status dropdown (Step 9)', () => {
  it('is a <select> with the id task-status-<task id>', () => {
    renderItem()
    expect(statusSelect().tagName).toBe('SELECT')
    expect(statusSelect()).toHaveAttribute('id', 'task-status-4')
  })

  it('has one option per task status, in order', () => {
    renderItem()
    const options = within(statusSelect()).getAllByRole('option')
    expect(options.map(o => o.value)).toEqual(['open', 'in_progress', 'complete'])
  })

  it('starts on the task\'s status', () => {
    renderItem()
    expect(statusSelect()).toHaveValue('in_progress')
  })

  it('PATCHes /tasks/:id as soon as it changes', async () => {
    respond(true, 200, { ...TASK, status: 'complete' })
    renderItem()
    change(statusSelect(), 'complete')
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/tasks/4')
    expect(options.method).toBe('PATCH')
  })

  it('sends exactly { status }, never the whole task', async () => {
    respond(true, 200, { ...TASK, status: 'complete' })
    renderItem()
    change(statusSelect(), 'complete')
    await flush()
    expect(sentBody()).toEqual({ status: 'complete' })
  })

  it('calls onUpdateTask once with the server\'s updated task', async () => {
    const updated = { ...TASK, status: 'complete' }
    respond(true, 200, updated)
    const { onUpdateTask, onDeleteTask } = renderItem()
    change(statusSelect(), 'complete')
    await flush()
    expect(onUpdateTask).toHaveBeenCalledTimes(1)
    expect(onUpdateTask).toHaveBeenCalledWith(updated)
    expect(onDeleteTask).not.toHaveBeenCalled()
  })

  it('does not call onUpdateTask before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const { onUpdateTask } = renderItem()
    change(statusSelect(), 'complete')
    await flush()
    expect(onUpdateTask).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 200, data: { ...TASK, status: 'complete' } }))
    expect(onUpdateTask).toHaveBeenCalledTimes(1)
  })

  it('shows the new status once the list hands back the updated task', async () => {
    respond(true, 200, { ...TASK, status: 'complete' })
    render(<Harness initial={TASK} />)
    change(statusSelect(), 'complete')
    await flush()
    expect(statusSelect()).toHaveValue('complete')
  })

  it('follows the task prop when it changes', () => {
    //A copy of the status in useState would keep showing the old one
    const { rerender } = renderItem()
    rerender({ ...TASK, status: 'open' })
    expect(statusSelect()).toHaveValue('open')
  })

  it('snaps back and shows the error when the server refuses', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    const { onUpdateTask } = renderItem()
    change(statusSelect(), 'complete')
    expect(await screen.findByText('unauthorized access')).toBeInTheDocument()
    expect(statusSelect()).toHaveValue('in_progress')
    expect(onUpdateTask).not.toHaveBeenCalled()
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderItem()
    change(statusSelect(), 'complete')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('clears the old error as soon as you change it again', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    renderItem()
    change(statusSelect(), 'complete')
    await screen.findByText('unauthorized access')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    change(statusSelect(), 'open')
    await flush()
    expect(screen.queryByText('unauthorized access')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 200, data: { ...TASK, status: 'open' } }))
  })
})

describe('TaskItem: the Assignee dropdown (Step 10)', () => {
  it('is a <select> with the id task-assignee-<task id>', () => {
    renderItem()
    expect(assigneeSelect().tagName).toBe('SELECT')
    expect(assigneeSelect()).toHaveAttribute('id', 'task-assignee-4')
  })

  it('has one option per user, showing the username, with the id as the value', () => {
    renderItem()
    const options = within(assigneeSelect()).getAllByRole('option')
    expect(options.map(o => o.textContent)).toEqual(['admin', 'douglasmoore', 'tasha44'])
    expect(options.map(o => o.value)).toEqual(['1', '3', '6'])
  })

  it('starts on the current assignee', () => {
    renderItem()
    expect(assigneeSelect()).toHaveValue('6')
  })

  it('PATCHes /tasks/:id with exactly { employee_id }', async () => {
    respond(true, 200, { ...TASK, employee_id: 3, employee: { ...OTHER } })
    renderItem()
    change(assigneeSelect(), '3')
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/tasks/4')
    expect(options.method).toBe('PATCH')
    const body = sentBody()
    expect(Object.keys(body)).toEqual(['employee_id'])
    expect(Number(body.employee_id)).toBe(3)
  })

  it('calls onUpdateTask once with the server\'s updated task', async () => {
    const updated = { ...TASK, employee_id: 3, employee: { ...OTHER } }
    respond(true, 200, updated)
    const { onUpdateTask } = renderItem()
    change(assigneeSelect(), '3')
    await flush()
    expect(onUpdateTask).toHaveBeenCalledTimes(1)
    expect(onUpdateTask).toHaveBeenCalledWith(updated)
  })

  it('follows the task prop when it changes', () => {
    loginAs(ADMIN)
    const { rerender } = renderItem()
    rerender({ ...TASK, employee_id: 3, employee: { ...OTHER } })
    expect(assigneeSelect()).toHaveValue('3')
  })

  it('snaps back and shows the error when the server refuses', async () => {
    respond(false, 404, { error: 'User not found' })
    const { onUpdateTask } = renderItem()
    change(assigneeSelect(), '3')
    expect(await screen.findByText('User not found')).toBeInTheDocument()
    expect(assigneeSelect()).toHaveValue('6')
    expect(onUpdateTask).not.toHaveBeenCalled()
  })

  it('hands the task away: a non-admin loses the controls after reassigning it', async () => {
    respond(true, 200, { ...TASK, employee_id: 3, employee: { ...OTHER } })
    render(<Harness initial={TASK} />)
    change(assigneeSelect(), '3')
    await flush()
    expect(queryStatus()).not.toBeInTheDocument()
    expect(queryAssignee()).not.toBeInTheDocument()
    expect(queryDelete()).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('douglasmoore')
  })

  it('an admin keeps the controls after reassigning', async () => {
    loginAs(ADMIN)
    respond(true, 200, { ...TASK, employee_id: 3, employee: { ...OTHER } })
    render(<Harness initial={TASK} />)
    change(assigneeSelect(), '3')
    await flush()
    expect(assigneeSelect()).toHaveValue('3')
    expect(queryDelete()).toBeInTheDocument()
  })
})

describe('TaskItem: Delete (Step 11)', () => {
  it('sends DELETE /tasks/:id', async () => {
    respond(true, 204, null)
    renderItem()
    fireEvent.click(queryDelete())
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/tasks/4')
    expect(options.method).toBe('DELETE')
  })

  it('calls onDeleteTask with the task id when it works (204 has no body)', async () => {
    respond(true, 204, null)
    const { onDeleteTask, onUpdateTask } = renderItem()
    fireEvent.click(queryDelete())
    await flush()
    expect(onDeleteTask).toHaveBeenCalledTimes(1)
    expect(onDeleteTask).toHaveBeenCalledWith(4)
    expect(onUpdateTask).not.toHaveBeenCalled()
  })

  it('shows no "Something went wrong" after a successful delete', async () => {
    respond(true, 204, null)
    renderItem()
    fireEvent.click(queryDelete())
    await flush()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('shows the error and keeps the task when the server refuses', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    const { onDeleteTask } = renderItem()
    fireEvent.click(queryDelete())
    expect(await screen.findByText('unauthorized access')).toBeInTheDocument()
    expect(onDeleteTask).not.toHaveBeenCalled()
  })

  it('shows "Something went wrong" when a failed delete has no body', async () => {
    respond(false, 500, null)
    renderItem()
    fireEvent.click(queryDelete())
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('is a plain button, not a form submit', () => {
    renderItem()
    expect(queryDelete()).toHaveAttribute('type', 'button')
  })
})

describe('TaskItem: more than one task on the page', () => {
  it('gives every task\'s dropdowns their own ids', () => {
    loginAs(ADMIN)
    render(
      <ul>
        <TaskItem task={TASK} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
        <TaskItem task={{ ...TASK, id: 9 }} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
      </ul>,
    )
    const ids = screen.getAllByRole('combobox').map(select => select.id)
    expect(ids.sort()).toEqual(['task-assignee-4', 'task-assignee-9', 'task-status-4', 'task-status-9'])
  })

  it('PATCHes the task whose dropdown changed', async () => {
    loginAs(ADMIN)
    respond(true, 200, { ...TASK, id: 9, status: 'complete' })
    render(
      <ul>
        <TaskItem task={TASK} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
        <TaskItem task={{ ...TASK, id: 9 }} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
      </ul>,
    )
    const [, second] = screen.getAllByRole('listitem')
    change(within(second).getByLabelText('Status'), 'complete')
    await flush()
    expect(apiFetch.mock.calls[0][0]).toBe('/tasks/9')
  })
})
