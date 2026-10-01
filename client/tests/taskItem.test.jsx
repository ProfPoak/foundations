import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { apiFetch } from '../src/api.js'
import { useAuth } from '../src/context/AuthContext.jsx'
import TaskItem from '../src/components/customer/TaskItem.jsx'

//Day 5, Step 3: TaskItem shows one task: title, assignee, due date, status and notes.
//The dropdowns and Delete (Block C) are tested in taskItemActions.test.jsx
vi.mock('../src/api.js', () => ({ apiFetch: vi.fn() }))
//TaskItem will read the logged-in user in Block C. Here that user is neither the assignee nor
//an admin, so these display tests keep passing once the dropdowns and Delete exist
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const TASK = {
  id: 4, title: 'Follow up call', status: 'in_progress', due_date: '2026-10-05',
  notes: 'Ask about the second property.', employee_id: 6, customer_id: 1,
  employee: { id: 6, username: 'tasha44', is_admin: false },
}

const USERS = [
  { id: 1, username: 'admin', is_admin: true },
  { id: 6, username: 'tasha44', is_admin: false },
  { id: 99, username: 'someone_else', is_admin: false },
]

beforeEach(() => {
  apiFetch.mockReset()
  useAuth.mockReturnValue({ user: { id: 99, username: 'someone_else', is_admin: false } })
})

function renderItem(task = TASK) {
  return render(
    <ul>
      <TaskItem task={task} users={USERS} onUpdateTask={vi.fn()} onDeleteTask={vi.fn()} />
    </ul>,
  )
}

function itemText() {
  return screen.getByRole('listitem').textContent
}

describe('TaskItem: display', () => {
  it('renders a single list item', () => {
    renderItem()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows the title', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('Follow up call')
  })

  it('shows the assignee by username', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('tasha44')
  })

  it('shows the status', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('in_progress')
  })

  it('shows the notes when there are some', () => {
    renderItem()
    expect(screen.getByRole('listitem')).toHaveTextContent('Ask about the second property.')
  })

  it('shows the values of the task it is given', () => {
    renderItem({
      ...TASK, title: 'Send listing docs', status: 'complete', notes: 'Emailed twice',
      employee_id: 1, employee: { id: 1, username: 'admin', is_admin: true },
    })
    const li = screen.getByRole('listitem')
    expect(li).toHaveTextContent('Send listing docs')
    expect(li).toHaveTextContent('complete')
    expect(li).toHaveTextContent('Emailed twice')
    expect(li).toHaveTextContent('admin')
  })
})

describe('TaskItem: the due date', () => {
  it('shows the due date exactly as the server sent it', () => {
    //new Date('2026-10-05') is midnight UTC, which is October 4th in US time zones
    renderItem()
    expect(itemText()).toContain('2026-10-05')
  })

  it('does not reformat the due date into a local date', () => {
    renderItem()
    expect(itemText()).not.toMatch(/10\/[45]\/2026/)
  })

  it('shows no due date, and no "Due", when there isn\'t one', () => {
    renderItem({ ...TASK, due_date: null })
    expect(itemText()).not.toMatch(/due/i)
  })
})

describe('TaskItem: empty values', () => {
  it('never shows "null" or "undefined"', () => {
    renderItem({ ...TASK, due_date: null, notes: null })
    expect(itemText()).not.toMatch(/null|undefined/)
  })

  it('shows nothing extra for notes of "" (the same as null)', () => {
    //The server stores a blank textarea as "", so `notes &&` must cover both
    const { container: withNull } = renderItem({ ...TASK, notes: null })
    const nullHtml = withNull.innerHTML
    withNull.remove()
    const { container: withBlank } = renderItem({ ...TASK, notes: '' })
    expect(withBlank.innerHTML).toBe(nullHtml)
  })

  it('leaves no empty element behind for missing notes or due date', () => {
    //<p>{task.notes}</p> without a check renders an empty <p>
    renderItem({ ...TASK, due_date: null, notes: null })
    const empty = [...screen.getByRole('listitem').querySelectorAll('*')]
      .filter(el => !['BR', 'HR', 'IMG', 'SVG'].includes(el.tagName.toUpperCase()))
      .filter(el => el.textContent.trim() === '')
      .map(el => el.outerHTML)
    expect(empty).toEqual([])
  })

  it('renders less for a task with no notes than for one with notes', () => {
    //Guards the test above: rendering notes must actually change the markup
    const { container: withNotes } = renderItem()
    const notesHtml = withNotes.innerHTML
    withNotes.remove()
    const { container: withNull } = renderItem({ ...TASK, notes: null })
    expect(withNull.innerHTML).not.toBe(notesHtml)
  })
})

describe('TaskItem: someone else\'s task, as a non-admin', () => {
  it('makes no requests', () => {
    renderItem()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('shows no dropdowns', () => {
    renderItem()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows no Delete button', () => {
    renderItem()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})
