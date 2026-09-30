import { useApiForm } from '../../hooks/useApiForm'
import { INTERACTIONS } from '../../constants'
import ErrorMessage from '../shared/ErrorMessage'

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
      <form onSubmit={handleSubmit} noValidate>

        <label htmlFor="interaction">Interaction</label>
        <select name="interaction" id="interaction" value={formData.interaction} onChange={handleChange}>
          {INTERACTIONS.map(interaction => (
            <option key={interaction} value={interaction}>{interaction}</option>
          ))}
        </select>

        <label htmlFor="notes">Notes</label>
        <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange}></textarea>
        <button type="submit">Log Event</button>
      </form>

      <ErrorMessage errors={errors}/>
    </section>
  )
}

export default EventForm
