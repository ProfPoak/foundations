import { useState } from "react"
import { apiFetch } from "../../api"
import { useAuth } from '../../context/AuthContext'
import { useApiForm } from "../../hooks/useApiForm"
import ErrorMessage from "../shared/ErrorMessage"
import styles from "../../styles/customer/Item.module.css"
import formStyles from "../../styles/customer/ItemForm.module.css"

function NoteItem({ note, onUpdateNote, onDeleteNote }) {
  const { user } = useAuth()
  const canModify = user.is_admin === true || note.employee_id === user.id

  const [isEditing, setIsEditing] = useState(false)

  const { formData, setFormData, errors, setErrors, handleChange, handleSubmit } = useApiForm({
    initial: null,
    path: `/notes/${note.id}`,
    method: 'PATCH',
    onSuccess: updated => {
      onUpdateNote(updated)
      setIsEditing(false)
    }
  })

  function startEditing() {
    setFormData({content: note.content})
    setErrors(null)
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setErrors(null)
  }

  async function handleDelete() {
    setErrors(null)
    const result = await apiFetch(`/notes/${note.id}`, {method: 'DELETE'})
    if(result.ok) {
      onDeleteNote(note.id)
    }
    else{
      setErrors(result.data ?? {})
    }
  }

  function renderForm() {
      return(
          <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
            <div className={formStyles.field}>
              <label className={formStyles.label} htmlFor={`edit-note-${note.id}`}>Edit note</label>
              <textarea className={formStyles.input} name="content" id={`edit-note-${note.id}`} value={formData.content} onChange={handleChange}></textarea>
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
      {isEditing ? renderForm() : <p className={styles.body} style={{ whiteSpace: 'pre-line' }}>{note.content}</p>}
      <p className={styles.meta}>{note.employee.username}</p>
      <p className={styles.meta}>{new Date(note.datetime).toLocaleString()}</p>
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

export default NoteItem
