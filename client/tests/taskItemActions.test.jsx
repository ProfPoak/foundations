import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { useState } from 'react'
import { apiFetch } from '../src/api.js'
import { useAuth } from '../src/context/AuthContext.jsx'
import TaskItem from '../src/components/customer/TaskItem.jsx'

//Day 5, Steps 8–10: TaskItem shows Edit/Delete only to the assignee or an admin, edits the
//task in place (PATCH /tasks/:id with exactly title, employee_id, due_date, status and notes),
//and deletes (DELETE /tasks/:id). The same flow as NoteItem
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
  return { ...view, onUpdateTask, onDeleteTask }
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

function button(name) {
  return screen.getByRole('button', { name })
}

function queryButton(name) {
  return screen.queryByRole('button', { name })
}

function click(name) {
  fireEvent.click(button(name))
}

const field = {
  title: () => screen.getByLabelText('Title'),
  assignee: () => screen.getByLabelText('Assignee'),
  dueDate: () => screen.getByLabelText('Due date'),
  status: () => screen.getByLabelText('Status'),
  notes: () => screen.getByLabelText('Task notes'),
}

function change(input, value) {
  fireEvent.change(input, { target: { value } })
}

function form() {
  return button('Save').closest('form')
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

describe('TaskItem: who sees Edit and Delete (Step 8)', () => {
  it('shows them to the assignee', () => {
    renderItem()
    expect(queryButton('Edit')).toBeInTheDocument()
    expect(queryButton('Delete')).toBeInTheDocument()
  })

  it('shows them to an admin on someone else\'s task', () => {
    loginAs(ADMIN)
    renderItem()
    expect(queryButton('Edit')).toBeInTheDocument()
    expect(queryButton('Delete')).toBeInTheDocument()
  })

  it('hides them from a non-admin who isn\'t the assignee', () => {
    loginAs(OTHER)
    renderItem()
    expect(queryButton('Edit')).not.toBeInTheDocument()
    expect(queryButton('Delete')).not.toBeInTheDocument()
  })

  it('compares ids, not usernames', () => {
    //Same username as the assignee, different id: still not the assignee
    loginAs({ id: 99, username: 'tasha44', is_admin: false })
    renderItem()
    expect(queryButton('Edit')).not.toBeInTheDocument()
  })

  it('shows the task as text, with no form, until Edit is clicked', () => {
    renderItem()
    const li = screen.getByRole('listitem')
    expect(li).toHaveTextContent('Follow up call')
    expect(li).toHaveTextContent('tasha44')
    expect(li).toHaveTextContent('in_progress')
    expect(li).toHaveTextContent('2026-10-05')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('uses plain buttons, not form submits', () => {
    renderItem()
    expect(button('Edit')).toHaveAttribute('type', 'button')
    expect(button('Delete')).toHaveAttribute('type', 'button')
  })

  it('makes no request just by rendering', () => {
    const { onUpdateTask, onDeleteTask } = renderItem()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdateTask).not.toHaveBeenCalled()
    expect(onDeleteTask).not.toHaveBeenCalled()
  })
})

describe('TaskItem: starting an edit (Step 9)', () => {
  it('fills every field with the task\'s current values', () => {
    renderItem({ ...TASK, notes: 'Ask about financing' })
    click('Edit')
    expect(field.title()).toHaveValue('Follow up call')
    expect(field.assignee()).toHaveValue('6')
    expect(field.dueDate()).toHaveValue('2026-10-05')
    expect(field.status()).toHaveValue('in_progress')
    expect(field.notes()).toHaveValue('Ask about financing')
  })

  it('fills notes with "" when the task has none (no uncontrolled warning)', () => {
    renderItem()
    click('Edit')
    expect(field.notes()).toHaveValue('')
  })

  it('uses the right kind of input for each field', () => {
    renderItem()
    click('Edit')
    expect(field.title().tagName).toBe('INPUT')
    expect(field.assignee().tagName).toBe('SELECT')
    expect(field.dueDate()).toHaveAttribute('type', 'date')
    expect(field.status().tagName).toBe('SELECT')
    expect(field.notes().tagName).toBe('TEXTAREA')
  })

  it('names each field after the key it sends', () => {
    renderItem()
    click('Edit')
    expect(field.title()).toHaveAttribute('name', 'title')
    expect(field.assignee()).toHaveAttribute('name', 'employee_id')
    expect(field.dueDate()).toHaveAttribute('name', 'due_date')
    expect(field.status()).toHaveAttribute('name', 'status')
    expect(field.notes()).toHaveAttribute('name', 'notes')
  })

  it('gives every field an id that includes the task id', () => {
    renderItem()
    click('Edit')
    expect(field.title()).toHaveAttribute('id', 'edit-task-title-4')
    expect(field.assignee()).toHaveAttribute('id', 'edit-task-assignee-4')
    expect(field.dueDate()).toHaveAttribute('id', 'edit-task-due-date-4')
    expect(field.status()).toHaveAttribute('id', 'edit-task-status-4')
    expect(field.notes()).toHaveAttribute('id', 'edit-task-notes-4')
  })

  it('lists every user in the Assignee dropdown, by username, with the id as the value', () => {
    renderItem()
    click('Edit')
    const options = within(field.assignee()).getAllByRole('option')
    expect(options.map(o => o.textContent)).toEqual(['admin', 'douglasmoore', 'tasha44'])
    expect(options.map(o => o.value)).toEqual(['1', '3', '6'])
  })

  it('lists every task status in the Status dropdown, in order', () => {
    renderItem()
    click('Edit')
    const options = within(field.status()).getAllByRole('option')
    expect(options.map(o => o.value)).toEqual(['open', 'in_progress', 'complete'])
  })

  it('has Save (submit) and Cancel (plain button) inside a noValidate form', () => {
    renderItem()
    click('Edit')
    expect(button('Save')).toHaveAttribute('type', 'submit')
    expect(button('Cancel')).toHaveAttribute('type', 'button')
    expect(form()).not.toBeNull()
    expect(form().noValidate).toBe(true)
  })

  it('hides Edit and Delete while editing', () => {
    renderItem()
    click('Edit')
    expect(queryButton('Edit')).not.toBeInTheDocument()
    expect(queryButton('Delete')).not.toBeInTheDocument()
  })

  it('updates the fields as you type', () => {
    renderItem()
    click('Edit')
    change(field.title(), 'Call back')
    change(field.status(), 'complete')
    expect(field.title()).toHaveValue('Call back')
    expect(field.status()).toHaveValue('complete')
  })

  it('makes no request just by opening the form', () => {
    renderItem()
    click('Edit')
    expect(apiFetch).not.toHaveBeenCalled()
  })
})

describe('TaskItem: saving (Step 9)', () => {
  it('PATCHes /tasks/:id', async () => {
    respond(true, 200, TASK)
    renderItem()
    click('Edit')
    click('Save')
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/tasks/4')
    expect(options.method).toBe('PATCH')
  })

  it('sends exactly the five editable keys, never id, employee or customer', async () => {
    respond(true, 200, TASK)
    renderItem()
    click('Edit')
    click('Save')
    await flush()
    expect(Object.keys(sentBody()).sort()).toEqual(['due_date', 'employee_id', 'notes', 'status', 'title'])
  })

  it('sends what you changed', async () => {
    respond(true, 200, TASK)
    renderItem()
    click('Edit')
    change(field.title(), 'Call back')
    change(field.assignee(), '3')
    change(field.dueDate(), '2026-11-20')
    change(field.status(), 'complete')
    change(field.notes(), 'Left a voicemail')
    click('Save')
    await flush()
    const body = sentBody()
    expect(body.title).toBe('Call back')
    expect(Number(body.employee_id)).toBe(3)
    expect(body.due_date).toBe('2026-11-20')
    expect(body.status).toBe('complete')
    expect(body.notes).toBe('Left a voicemail')
  })

  it('sends the unchanged values when you only change one thing', async () => {
    respond(true, 200, TASK)
    renderItem()
    click('Edit')
    change(field.status(), 'complete')
    click('Save')
    await flush()
    const body = sentBody()
    expect(body.title).toBe('Follow up call')
    expect(Number(body.employee_id)).toBe(6)
    expect(body.due_date).toBe('2026-10-05')
    expect(body.notes ?? '').toBe('')
  })

  it('submits when the form is submitted, not only on click', async () => {
    respond(true, 200, TASK)
    renderItem()
    click('Edit')
    fireEvent.submit(form())
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('prevents the browser from reloading the page', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderItem()
    click('Edit')
    expect(fireEvent.submit(form())).toBe(false)
  })

  it('calls onUpdateTask once with the server\'s updated task', async () => {
    const updated = { ...TASK, status: 'complete' }
    respond(true, 200, updated)
    const { onUpdateTask, onDeleteTask } = renderItem()
    click('Edit')
    change(field.status(), 'complete')
    click('Save')
    await flush()
    expect(onUpdateTask).toHaveBeenCalledTimes(1)
    expect(onUpdateTask).toHaveBeenCalledWith(updated)
    expect(onDeleteTask).not.toHaveBeenCalled()
  })

  it('does not call onUpdateTask before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const { onUpdateTask } = renderItem()
    click('Edit')
    click('Save')
    await flush()
    expect(onUpdateTask).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 200, data: TASK }))
    expect(onUpdateTask).toHaveBeenCalledTimes(1)
  })

  it('goes back to view mode, showing the saved values', async () => {
    respond(true, 200, { ...TASK, title: 'Call back', status: 'complete' })
    render(<Harness initial={TASK} />)
    click('Edit')
    change(field.title(), 'Call back')
    change(field.status(), 'complete')
    click('Save')
    await flush()
    expect(queryButton('Save')).not.toBeInTheDocument()
    const li = screen.getByRole('listitem')
    expect(li).toHaveTextContent('Call back')
    expect(li).toHaveTextContent('complete')
    expect(queryButton('Edit')).toBeInTheDocument()
  })

  it('starts the next edit from the saved values', async () => {
    respond(true, 200, { ...TASK, title: 'Call back' })
    render(<Harness initial={TASK} />)
    click('Edit')
    change(field.title(), 'Call back')
    click('Save')
    await flush()
    click('Edit')
    expect(field.title()).toHaveValue('Call back')
  })
})

describe('TaskItem: a failed save (Step 9)', () => {
  it('shows "Title cannot be left empty", keeps the form open, and keeps what you typed', async () => {
    respond(false, 400, { error: 'Title cannot be left empty' })
    const { onUpdateTask } = renderItem()
    click('Edit')
    change(field.title(), '')
    change(field.notes(), 'Keep me')
    click('Save')
    expect(await screen.findByText('Title cannot be left empty')).toBeInTheDocument()
    expect(field.title()).toHaveValue('')
    expect(field.notes()).toHaveValue('Keep me')
    expect(onUpdateTask).not.toHaveBeenCalled()
  })

  it('shows "Due date cannot be left empty" and keeps the form open', async () => {
    respond(false, 400, { error: 'Due date cannot be left empty' })
    renderItem()
    click('Edit')
    change(field.dueDate(), '')
    click('Save')
    expect(await screen.findByText('Due date cannot be left empty')).toBeInTheDocument()
    expect(button('Save')).toBeInTheDocument()
    expect(sentBody().due_date ?? '').toBe('')
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderItem()
    click('Edit')
    click('Save')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('clears the old error as soon as you save again', async () => {
    respond(false, 400, { error: 'Title cannot be left empty' })
    renderItem()
    click('Edit')
    change(field.title(), '')
    click('Save')
    await screen.findByText('Title cannot be left empty')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    change(field.title(), 'Call back')
    click('Save')
    await flush()
    expect(screen.queryByText('Title cannot be left empty')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 200, data: TASK }))
  })
})

describe('TaskItem: Cancel (Step 9)', () => {
  it('goes back to view mode without a request', () => {
    const { onUpdateTask } = renderItem()
    click('Edit')
    change(field.title(), 'Something else')
    click('Cancel')
    expect(queryButton('Save')).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('Follow up call')
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onUpdateTask).not.toHaveBeenCalled()
  })

  it('throws the changes away, so the next edit starts from the task again', () => {
    renderItem()
    click('Edit')
    change(field.title(), 'Something else')
    change(field.status(), 'complete')
    click('Cancel')
    click('Edit')
    expect(field.title()).toHaveValue('Follow up call')
    expect(field.status()).toHaveValue('in_progress')
  })

  it('clears an error from a failed save', async () => {
    respond(false, 400, { error: 'Title cannot be left empty' })
    renderItem()
    click('Edit')
    change(field.title(), '')
    click('Save')
    await screen.findByText('Title cannot be left empty')
    click('Cancel')
    expect(screen.queryByText('Title cannot be left empty')).not.toBeInTheDocument()
  })
})

describe('TaskItem: reassigning hands the task away', () => {
  it('a non-admin loses Edit and Delete after saving someone else as the assignee', async () => {
    respond(true, 200, { ...TASK, employee_id: 3, employee: { ...OTHER } })
    render(<Harness initial={TASK} />)
    click('Edit')
    change(field.assignee(), '3')
    click('Save')
    await flush()
    expect(queryButton('Edit')).not.toBeInTheDocument()
    expect(queryButton('Delete')).not.toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('douglasmoore')
  })

  it('an admin keeps Edit and Delete after reassigning', async () => {
    loginAs(ADMIN)
    respond(true, 200, { ...TASK, employee_id: 3, employee: { ...OTHER } })
    render(<Harness initial={TASK} />)
    click('Edit')
    change(field.assignee(), '3')
    click('Save')
    await flush()
    expect(queryButton('Edit')).toBeInTheDocument()
    expect(queryButton('Delete')).toBeInTheDocument()
  })
})

describe('TaskItem: Delete (Step 10)', () => {
  it('sends DELETE /tasks/:id', async () => {
    respond(true, 204, null)
    renderItem()
    click('Delete')
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/tasks/4')
    expect(options.method).toBe('DELETE')
  })

  it('calls onDeleteTask with the task id when it works (204 has no body)', async () => {
    respond(true, 204, null)
    const { onDeleteTask, onUpdateTask } = renderItem()
    click('Delete')
    await flush()
    expect(onDeleteTask).toHaveBeenCalledTimes(1)
    expect(onDeleteTask).toHaveBeenCalledWith(4)
    expect(onUpdateTask).not.toHaveBeenCalled()
  })

  it('shows no "Something went wrong" after a successful delete', async () => {
    respond(true, 204, null)
    renderItem()
    click('Delete')
    await flush()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('shows the error in view mode and keeps the task when the server refuses', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    const { onDeleteTask } = renderItem()
    click('Delete')
    expect(await screen.findByText('unauthorized access')).toBeInTheDocument()
    expect(onDeleteTask).not.toHaveBeenCalled()
    expect(queryButton('Edit')).toBeInTheDocument()
  })

  it('shows "Something went wrong" when a failed delete has no body', async () => {
    respond(false, 500, null)
    renderItem()
    click('Delete')
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('clears a delete error when you start editing', async () => {
    respond(false, 403, { error: 'unauthorized access' })
    renderItem()
    click('Delete')
    await screen.findByText('unauthorized access')
    click('Edit')
    expect(screen.queryByText('unauthorized access')).not.toBeInTheDocument()
  })
})

describe('TaskItem: more than one task on the page', () => {
  function renderTwo() {
    loginAs(ADMIN)
    render(
      <ul>
        <TaskItem task={TASK} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
        <TaskItem task={{ ...TASK, id: 9, title: 'Second task' }} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
      </ul>,
    )
    return screen.getAllByRole('listitem')
  }

  it('gives every task\'s edit fields their own ids', () => {
    const [first, second] = renderTwo()
    fireEvent.click(within(first).getByRole('button', { name: 'Edit' }))
    fireEvent.click(within(second).getByRole('button', { name: 'Edit' }))
    const ids = [...document.querySelectorAll('input, select, textarea')].map(el => el.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(10)
  })

  it('PATCHes the task whose form was saved', async () => {
    respond(true, 200, { ...TASK, id: 9 })
    const [, second] = renderTwo()
    fireEvent.click(within(second).getByRole('button', { name: 'Edit' }))
    fireEvent.click(within(second).getByRole('button', { name: 'Save' }))
    await flush()
    expect(apiFetch.mock.calls[0][0]).toBe('/tasks/9')
  })
})
