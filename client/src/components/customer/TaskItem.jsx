import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { useApiForm } from '../../hooks/useApiForm'
import { apiFetch } from "../../services/api"
import ErrorMessage from "../shared/ErrorMessage"
import { TASK_STATUSES } from "../../utils/constants"
import styles from "../../styles/customer/Item.module.css"
import formStyles from "../../styles/customer/ItemForm.module.css"

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
      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor={`edit-task-title-${task.id}`}>Title</label>
        <input className={formStyles.input} type="text" id={`edit-task-title-${task.id}`} name="title" value={formData.title} onChange={handleChange} />
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor={`edit-task-assignee-${task.id}`}>Assignee</label>
        <select className={formStyles.input} name="employee_id" id={`edit-task-assignee-${task.id}`} value={formData.employee_id} onChange={handleChange} >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor={`edit-task-due-date-${task.id}`}>Due date</label>
        <input className={formStyles.input} type="date" id={`edit-task-due-date-${task.id}`} name="due_date" value={formData.due_date} onChange={handleChange} />
      </div>

      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor={`edit-task-status-${task.id}`}>Status</label>
        <select className={formStyles.input} name="status" id={`edit-task-status-${task.id}`} value={formData.status} onChange={handleChange}>
          {TASK_STATUSES.map(status =>
            <option key={status} value={status}>{status.replace('_', ' ')}</option>
          )}
        </select>
      </div>
      
      <div className={formStyles.field}>
        <label className={formStyles.label} htmlFor={`edit-task-notes-${task.id}`}>Task notes</label>
        <textarea className={formStyles.input} name="notes" id={`edit-task-notes-${task.id}`} value={formData.notes} onChange={handleChange} ></textarea>
      </div>

      <div className={formStyles.actions}>
        <button className={formStyles.submit} type="submit">Save</button>
        <button className={formStyles.cancel} type="button" onClick={handleCancel}>Cancel</button>
      </div>
    </form>
    )
  }


  return (
    <li className={styles.item}>
      {isEditing ? renderForm() : 
      <>
        <h3 className={styles.title}>{task.title}</h3>
        <p className={styles.meta}>{task.employee.username}</p>
        {task.due_date && <p className={styles.meta}>Due {task.due_date}</p>}
        <p className={styles.meta}>{task.status}</p>
        {task.notes && <p className={styles.body}>{task.notes}</p>}
      </>
      }
      {canModify && !isEditing && (
        <div className={styles.actions}>
          <button className={styles.edit} type="button" onClick={startEditing}>Edit</button>
          <button className={styles.delete} type="button" onClick={handleDelete}>Delete</button>
        </div>
      )}
      <ErrorMessage errors={errors} />
    </li>
  )
}

export default TaskItem
