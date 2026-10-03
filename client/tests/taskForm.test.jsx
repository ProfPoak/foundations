import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { apiFetch } from '../src/services/api.js'
import { useAuth } from '../src/context/AuthContext.jsx'
import TaskForm from '../src/components/customer/TaskForm.jsx'

//Day 5, Steps 5–6: TaskForm POSTs a new task itself, assigned to the logged-in user unless
//another user is picked, hands the created task up, and clears itself for the next one.
//The server requires a due date (Step 4); notes are optional
vi.mock('../src/services/api.js', () => ({ apiFetch: vi.fn() }))
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

//The logged-in user is deliberately not the first in the list, so starting on
//users[0] instead of user.id picks the wrong person
const ME = { id: 6, username: 'tasha44', is_admin: false }

const USERS = [
  { id: 1, username: 'admin', is_admin: true },
  { id: 3, username: 'douglasmoore', is_admin: false },
  ME,
]

//What the server sends back: it adds id, status, customer_id and employee
const CREATED = {
  id: 41, title: 'Follow up call', status: 'open', due_date: '2026-10-05', notes: null,
  employee_id: 6, customer_id: 7, employee: ME,
}

//React logs each controlled/uncontrolled warning only once per run, so every test checks for it
let controlledWarnings
beforeEach(() => {
  apiFetch.mockReset()
  useAuth.mockReturnValue({ user: ME })
  controlledWarnings = []
  const original = console.error
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    const message = args.map(String).join(' ')
    if (/controlled/i.test(message)) controlledWarnings.push(message)
    else original(...args)
  })
})

afterEach(() => {
  expect(controlledWarnings, 'React warned about a controlled/uncontrolled input').toEqual([])
})

function renderForm(users = USERS) {
  const onAddTask = vi.fn()
  const view = render(<TaskForm customerId="7" users={users} onAddTask={onAddTask} />)
  return { onAddTask, ...view }
}

function respond(ok, status, data) {
  apiFetch.mockResolvedValue({ ok, status, data })
}

const field = {
  title: () => screen.getByLabelText('Title'),
  assignee: () => screen.getByLabelText('Assign to'),
  dueDate: () => screen.getByLabelText('Due date'),
  notes: () => screen.getByLabelText('Task notes'),
}

function change(input, value) {
  fireEvent.change(input, { target: { value } })
}

function clickAdd() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Task' }))
}

function form() {
  return screen.getByRole('button', { name: 'Add Task' }).closest('form')
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
  const [, options] = apiFetch.mock.calls[call]
  return JSON.parse(options.body)
}

//Fills in a valid task (title and due date) unless told otherwise. dueDate: '' leaves the date empty
async function fillAndSubmit({ title = 'Follow up call', assignee, dueDate = '2026-10-05', notes } = {}) {
  change(field.title(), title)
  if (assignee !== undefined) change(field.assignee(), assignee)
  change(field.dueDate(), dueDate)
  if (notes !== undefined) change(field.notes(), notes)
  clickAdd()
  await flush()
}

describe('TaskForm: fields', () => {
  it('has an empty "Title" text input named title, with the id task-title', () => {
    renderForm()
    const input = field.title()
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('name', 'title')
    expect(input).toHaveAttribute('id', 'task-title')
    expect(input).toHaveValue('')
  })

  it('has an "Assign to" <select> named employee_id, with the id task-assignee', () => {
    renderForm()
    const select = field.assignee()
    expect(select.tagName).toBe('SELECT')
    expect(select).toHaveAttribute('name', 'employee_id')
    expect(select).toHaveAttribute('id', 'task-assignee')
  })

  it('has an empty "Due date" date input named due_date, with the id task-due-date', () => {
    renderForm()
    const input = field.dueDate()
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveAttribute('name', 'due_date')
    expect(input).toHaveAttribute('id', 'task-due-date')
    expect(input).toHaveValue('')
  })

  it('has an empty "Task notes" <textarea> named notes, with the id task-notes', () => {
    renderForm()
    const box = field.notes()
    expect(box.tagName).toBe('TEXTAREA')
    expect(box).toHaveAttribute('name', 'notes')
    expect(box).toHaveAttribute('id', 'task-notes')
    expect(box).toHaveValue('')
  })

  it('has no field labeled just "Notes", which EventForm already uses on the same page', () => {
    renderForm()
    expect(screen.queryByLabelText('Notes')).not.toBeInTheDocument()
  })

  it('has an Add Task submit button inside a noValidate form', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Add Task' })).toHaveAttribute('type', 'submit')
    expect(form()).not.toBeNull()
    expect(form().noValidate).toBe(true)
  })

  it('updates each field as you type', () => {
    renderForm()
    change(field.title(), 'Follow up call')
    change(field.dueDate(), '2026-10-05')
    change(field.notes(), 'Ask about financing')
    expect(field.title()).toHaveValue('Follow up call')
    expect(field.dueDate()).toHaveValue('2026-10-05')
    expect(field.notes()).toHaveValue('Ask about financing')
  })

  it('makes no request just by rendering', () => {
    const { onAddTask } = renderForm()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(onAddTask).not.toHaveBeenCalled()
  })
})

describe('TaskForm: the assignee dropdown', () => {
  it('has one option per user, showing the username', () => {
    renderForm()
    const options = within(field.assignee()).getAllByRole('option')
    expect(options.map(o => o.textContent)).toEqual(['admin', 'douglasmoore', 'tasha44'])
  })

  it('uses each user\'s id as the option value', () => {
    renderForm()
    const options = within(field.assignee()).getAllByRole('option')
    expect(options.map(o => o.value)).toEqual(['1', '3', '6'])
  })

  it('starts on the logged-in user, not the first user in the list', () => {
    renderForm()
    expect(field.assignee()).toHaveValue('6')
  })

  it('lands on the logged-in user when the users arrive after the first render', () => {
    //TasksSection passes [] until GET /users answers
    const { rerender } = renderForm([])
    rerender(<TaskForm customerId="7" users={USERS} onAddTask={vi.fn()} />)
    expect(field.assignee()).toHaveValue('6')
  })

  it('changes when you pick someone else', () => {
    renderForm()
    change(field.assignee(), '3')
    expect(field.assignee()).toHaveValue('3')
  })
})

describe('TaskForm: the request', () => {
  it('POSTs to /customers/:customerId/tasks', async () => {
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    const [path, options] = apiFetch.mock.calls[0]
    expect(path).toBe('/customers/7/tasks')
    expect(options.method).toBe('POST')
  })

  it('sends title, employee_id, due_date and notes, and nothing else', async () => {
    //No status (the server starts it at open) and no customer_id (it's in the path)
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit()
    expect(Object.keys(sentBody()).sort()).toEqual(['due_date', 'employee_id', 'notes', 'title'])
  })

  it('assigns the task to the logged-in user when the dropdown is untouched', async () => {
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit()
    expect(Number(sentBody().employee_id)).toBe(6)
  })

  it('assigns the task to whoever you picked', async () => {
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit({ assignee: '3' })
    expect(Number(sentBody().employee_id)).toBe(3)
  })

  it('sends what you typed', async () => {
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit({ title: 'Follow up call', dueDate: '2026-10-05', notes: 'Ask about financing' })
    const body = sentBody()
    expect(body.title).toBe('Follow up call')
    expect(body.due_date).toBe('2026-10-05')
    expect(body.notes).toBe('Ask about financing')
  })

  it('sends blank notes as a blank (the server turns them into null)', async () => {
    //Notes are optional
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit()
    expect(sentBody().notes ?? '').toBe('')
  })

  it('sends an empty due date as-is and lets the server reject it', async () => {
    //The server's "Due date cannot be left empty" is the message the user should see
    respond(false, 400, { error: 'Due date cannot be left empty' })
    renderForm()
    await fillAndSubmit({ dueDate: '' })
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(sentBody().due_date ?? '').toBe('')
  })

  it('sends a blank title as-is and lets the server reject it', async () => {
    //The server's "Title cannot be left empty" is the message the checkpoint wants to see
    respond(false, 400, { error: 'Title cannot be left empty' })
    renderForm()
    clickAdd()
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(sentBody().title).toBe('')
  })

  it('submits when the form is submitted, not only on click', async () => {
    respond(true, 201, CREATED)
    renderForm()
    change(field.title(), 'Follow up call')
    fireEvent.submit(form())
    await flush()
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('prevents the browser from reloading the page', () => {
    apiFetch.mockReturnValue(new Promise(() => {}))
    renderForm()
    expect(fireEvent.submit(form())).toBe(false)
  })
})

describe('TaskForm: success', () => {
  it('calls onAddTask once with the server\'s created task', async () => {
    respond(true, 201, CREATED)
    const { onAddTask } = renderForm()
    await fillAndSubmit()
    expect(onAddTask).toHaveBeenCalledTimes(1)
    expect(onAddTask).toHaveBeenCalledWith(CREATED)
  })

  it('does not call onAddTask before the response arrives', async () => {
    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    const { onAddTask } = renderForm()
    await fillAndSubmit()
    expect(onAddTask).not.toHaveBeenCalled()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
    expect(onAddTask).toHaveBeenCalledTimes(1)
  })

  it('clears the form for the next task', async () => {
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit({ dueDate: '2026-10-05', notes: 'Ask about financing' })
    expect(field.title()).toHaveValue('')
    expect(field.dueDate()).toHaveValue('')
    expect(field.notes()).toHaveValue('')
  })

  it('puts the assignee back on the logged-in user', async () => {
    respond(true, 201, { ...CREATED, employee_id: 3 })
    renderForm()
    await fillAndSubmit({ assignee: '3' })
    expect(field.assignee()).toHaveValue('6')
  })

  it('sends only the new values for the next task', async () => {
    respond(true, 201, CREATED)
    renderForm()
    await fillAndSubmit({ title: 'First', assignee: '3', dueDate: '2026-10-05', notes: 'Old notes' })
    await fillAndSubmit({ title: 'Second', dueDate: '2026-11-20' })
    const body = sentBody(1)
    expect(body.title).toBe('Second')
    expect(body.due_date).toBe('2026-11-20')
    expect(Number(body.employee_id)).toBe(6)
    expect(body.notes ?? '').toBe('')
  })
})

describe('TaskForm: failure', () => {
  it('shows "Title cannot be left empty" and does not call onAddTask', async () => {
    respond(false, 400, { error: 'Title cannot be left empty' })
    const { onAddTask } = renderForm()
    await fillAndSubmit({ title: '   ' })
    expect(await screen.findByText('Title cannot be left empty')).toBeInTheDocument()
    expect(onAddTask).not.toHaveBeenCalled()
  })

  it('shows "Due date cannot be left empty" and keeps what you typed', async () => {
    respond(false, 400, { error: 'Due date cannot be left empty' })
    const { onAddTask } = renderForm()
    await fillAndSubmit({ title: 'Keep me', dueDate: '', notes: 'Me too' })
    expect(await screen.findByText('Due date cannot be left empty')).toBeInTheDocument()
    expect(onAddTask).not.toHaveBeenCalled()
    expect(field.title()).toHaveValue('Keep me')
    expect(field.notes()).toHaveValue('Me too')
  })

  it('shows field errors from the server', async () => {
    respond(false, 400, { errors: { employee_id: ['Not a valid integer.'] } })
    renderForm()
    await fillAndSubmit()
    expect(await screen.findByText('employee_id: Not a valid integer.')).toBeInTheDocument()
  })

  it('keeps everything you entered, including the assignee', async () => {
    respond(false, 500, { error: 'Server exploded' })
    renderForm()
    await fillAndSubmit({ title: 'Keep me', assignee: '3', dueDate: '2026-10-05', notes: 'Me too' })
    await screen.findByText('Server exploded')
    expect(field.title()).toHaveValue('Keep me')
    expect(field.assignee()).toHaveValue('3')
    expect(field.dueDate()).toHaveValue('2026-10-05')
    expect(field.notes()).toHaveValue('Me too')
  })

  it('shows "Something went wrong" when the failure has no body', async () => {
    respond(false, 500, null)
    renderForm()
    await fillAndSubmit()
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
  })

  it('clears the old error as soon as you submit again', async () => {
    respond(false, 400, { error: 'Title cannot be left empty' })
    renderForm()
    clickAdd()
    await screen.findByText('Title cannot be left empty')

    const request = deferred()
    apiFetch.mockReturnValue(request.promise)
    await fillAndSubmit({ title: 'Now with a title' })
    expect(screen.queryByText('Title cannot be left empty')).not.toBeInTheDocument()
    await act(async () => request.resolve({ ok: true, status: 201, data: CREATED }))
  })

  it('shows no error once a retry succeeds', async () => {
    respond(false, 400, { error: 'Title cannot be left empty' })
    const { onAddTask } = renderForm()
    clickAdd()
    await screen.findByText('Title cannot be left empty')

    respond(true, 201, CREATED)
    await fillAndSubmit({ title: 'Now with a title' })
    expect(screen.queryByText('Title cannot be left empty')).not.toBeInTheDocument()
    expect(onAddTask).toHaveBeenCalledTimes(1)
  })
})
