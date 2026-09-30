import { useState } from "react"
import { apiFetch } from "../../api"
import { useAuth } from '../../context/AuthContext'
import { useApiForm } from "../../hooks/useApiForm"
import ErrorMessage from "../shared/ErrorMessage"

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
          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor={`edit-note-${note.id}`}>Edit note</label>
            <textarea name="content" id={`edit-note-${note.id}`} value={formData.content} onChange={handleChange}></textarea>
            <button type="submit">Save</button>
            <button type="button" onClick={handleCancel}>Cancel</button>
          </form>
    )
  }

  return (
    <li>
      {isEditing ? renderForm() : <p style={{ whiteSpace: 'pre-line' }}>{note.content}</p>}
      <p>{note.employee.username}</p>
      <p>{new Date(note.datetime).toLocaleString()}</p>
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

export default NoteItem
