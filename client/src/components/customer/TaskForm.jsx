import { useAuth } from "../../context/AuthContext"
import { useApiForm } from "../../hooks/useApiForm"
import ErrorMessage from "../shared/ErrorMessage"
import styles from "./ItemForm.module.css"

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
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-title">Title</label>
        <input className={styles.input} type="text" id="task-title" name="title" value={formData.title} onChange={handleChange} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-assignee">Assign to</label>
        <select className={styles.input} name="employee_id" id="task-assignee" value={formData.employee_id} onChange={handleChange} >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-due-date">Due date</label>
        <input className={styles.input} type="date" id="task-due-date" name="due_date" value={formData.due_date} onChange={handleChange} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="task-notes">Task notes</label>
        <textarea className={styles.input} name="notes" id="task-notes" value={formData.notes} onChange={handleChange} ></textarea>
      </div>

      <div className={styles.actions}>
        <button className={styles.submit} type="submit">Add Task</button>
      </div>
      <ErrorMessage errors={errors} />
    </form>
  )
}

export default TaskForm
