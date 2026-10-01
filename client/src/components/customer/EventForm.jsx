import { useApiForm } from '../../hooks/useApiForm'
import { INTERACTIONS } from '../../constants'
import ErrorMessage from '../shared/ErrorMessage'
import styles from '../../styles/customer/ItemForm.module.css'

const INITIAL = {
  'interaction': INTERACTIONS[0],
  'notes': ''
}

function EventForm({ customerId, onAddEvent }) {
  const { formData, errors, handleChange, handleSubmit } = useApiForm({
    initial: INITIAL,
    path: `/customers/${customerId}/events`,
    method: 'POST',
    onSuccess: onAddEvent,
    resetOnSuccess: true,
  })

  return (
    <section>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="interaction">Interaction</label>
          <select className={styles.input} name="interaction" id="interaction" value={formData.interaction} onChange={handleChange}>
            {INTERACTIONS.map(interaction => (
              <option key={interaction} value={interaction}>{interaction}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="notes">Notes</label>
          <textarea className={styles.input} name="notes" id="notes" value={formData.notes} onChange={handleChange}></textarea>
        </div>
        <div className={styles.actions}>
          <button className={styles.submit} type="submit">Log Event</button>
        </div>
      </form>

      <ErrorMessage errors={errors}/>
    </section>
  )
}

export default EventForm
