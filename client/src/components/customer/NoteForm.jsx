import { useApiForm } from "../../hooks/useApiForm"
import ErrorMessage from "../shared/ErrorMessage"
import styles from "../../styles/customer/ItemForm.module.css"

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
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="new-note">New note</label>
          <textarea className={styles.input} name="content" id="new-note" value={formData.content} onChange={handleChange}></textarea>
        </div>
        <div className={styles.actions}>
          <button className={styles.submit} type="submit">Add Note</button>
        </div>
        <ErrorMessage errors={errors}/>
      </form>
    </section>
  )
}

export default NoteForm
