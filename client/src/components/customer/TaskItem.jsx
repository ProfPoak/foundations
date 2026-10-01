import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useApiForm } from '../../hooks/useApiForm'
import { apiFetch } from "../../api"
import ErrorMessage from "../shared/ErrorMessage"
import { TASK_STATUSES } from "../../constants"

function TaskItem({ task, users, onUpdateTask, onDeleteTask }) {
  const { user } = useAuth()
  const canModify = user.is_admin === true || task.employee_id === user.id

  const [isEditing, setIsEditing] = useState(false)

  const { formData, setFormData, errors, setErrors, handleChange, handleSubmit } = useApiForm({
    initial: null,
    path: `/tasks/${task.id}`,
    method: 'PATCH',
    onSuccess: updated => {
      onUpdateTask(updated)
      setIsEditing(false)
    }
  })

  function startEditing() {
    setFormData({
    'title': task.title,
    'employee_id': task.employee_id,
    'due_date': task.due_date ?? '',
    'status': task.status,
    'notes': task.notes ?? ''
  })
    setErrors(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setErrors(null)
  }

  async function handleDelete() {
    setErrors(null)
    const result = await apiFetch(`/tasks/${task.id}`, {method: 'DELETE'})
    if(result.ok) {
      onDeleteTask(task.id)
    }
    else{
      setErrors(result.data ?? {})
    }
  }

  function renderForm() {
    return(
      <form onSubmit={handleSubmit} noValidate>
      <label htmlFor={`edit-task-title-${task.id}`}>Title</label>
      <input type="text" id={`edit-task-title-${task.id}`} name="title" value={formData.title} onChange={handleChange} />

      <label htmlFor={`edit-task-assignee-${task.id}`}>Assignee</label>
      <select name="employee_id" id={`edit-task-assignee-${task.id}`} value={formData.employee_id} onChange={handleChange} >
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.username}</option>
        ))}
      </select>

      <label htmlFor={`edit-task-due-date-${task.id}`}>Due date</label>
      <input type="date" id={`edit-task-due-date-${task.id}`} name="due_date" value={formData.due_date} onChange={handleChange} />

      <label htmlFor={`edit-task-status-${task.id}`}>Status</label>
      <select name="status" id={`edit-task-status-${task.id}`} value={formData.status} onChange={handleChange}>
        {TASK_STATUSES.map(status =>
          <option key={status} value={status}>{status}</option>
        )}
      </select>
      
      <label htmlFor={`edit-task-notes-${task.id}`}>Task notes</label>
      <textarea name="notes" id={`edit-task-notes-${task.id}`} value={formData.notes} onChange={handleChange} ></textarea>

      <button type="submit">Save</button>
      <button type="button" onClick={handleCancel}>Cancel</button>
    </form>
    )
  }


  return (
    <li>
      {isEditing ? renderForm() : 
      <>
        <h3>{task.title}</h3>
        <p>{task.employee.username}</p>
        {task.due_date && <p>Due {task.due_date}</p>}
        <p>{task.status}</p>
        {task.notes && <p>{task.notes}</p>}
      </>
      }
      {canModify && !isEditing && (
        <>
          <button type="button" onClick={startEditing}>Edit</button>
          <button type="button" onClick={handleDelete}>Delete</button>
        </>
      )}
      <ErrorMessage errors={errors} />
    </li>
  )
}

export default TaskItem
