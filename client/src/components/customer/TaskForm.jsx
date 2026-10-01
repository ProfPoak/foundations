import { useAuth } from "../../context/AuthContext"
import { useApiForm } from "../../hooks/useApiForm"
import ErrorMessage from "../shared/ErrorMessage"

function TaskForm({ customerId, users, onAddTask }) {
  const { user } = useAuth()

  const initial = {
    'title': '',
    'employee_id': user.id,
    'due_date': '',
    'notes': ''
  }

  const { formData, errors, handleChange, handleSubmit } = useApiForm({
    initial: initial,
    path: `/customers/${customerId}/tasks`,
    method: 'POST',
    onSuccess: onAddTask,
    resetOnSuccess: true
  })
  
  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="task-title">Title</label>
      <input type="text" id="task-title" name="title" value={formData.title} onChange={handleChange} />

      <label htmlFor="task-assignee">Assign to</label>
      <select name="employee_id" id="task-assignee" value={formData.employee_id} onChange={handleChange} >
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.username}</option>
        ))}
      </select>

      <label htmlFor="task-due-date">Due date</label>
      <input type="date" id="task-due-date" name="due_date" value={formData.due_date} onChange={handleChange} />

      <label htmlFor="task-notes">Task notes</label>
      <textarea name="notes" id="task-notes" value={formData.notes} onChange={handleChange} ></textarea>

      <button type="submit">Add Task</button>
      <ErrorMessage errors={errors} />
    </form>
  )
}

export default TaskForm
