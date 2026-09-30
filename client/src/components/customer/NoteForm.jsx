import { useApiForm } from "../../hooks/useApiForm"
import ErrorMessage from "../shared/ErrorMessage"

const INITIAL = {
  'content': ''
}

function NoteForm({ customerId, onAddNote }) {
  const { formData, errors, handleChange, handleSubmit } = useApiForm({
    initial: INITIAL,
    path: `/customers/${customerId}/notes`,
    method: 'POST',
    onSuccess: onAddNote,
    resetOnSuccess: true
  })
  
  return (
    <section>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="new-note">New note</label>
        <textarea name="content" id="new-note" value={formData.content} onChange={handleChange}></textarea>
        <button type="submit">Add Note</button>
        <ErrorMessage errors={errors}/>
      </form>
    </section>
  )
}

export default NoteForm
