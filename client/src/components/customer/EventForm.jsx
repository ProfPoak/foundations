import { useState } from "react"
import { apiFetch } from '../../api'
import { INTERACTIONS } from '../../constants'
import ErrorMessage from '../shared/ErrorMessage'

const INITIAL = {
  'interaction': INTERACTIONS[0],
  'notes': ''
}

function EventForm({ customerId, onAddEvent }) {
  const [formData, setFormData] = useState(INITIAL)
  const [errors, setErrors] = useState(null)

  function handleChange(e) {
    const {name, value} = e.target
    const updated = { ...formData, [name]:value}
    setFormData(updated)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors(null)
    
    const result = await apiFetch(
      `/customers/${customerId}/events`, 
      {method: 'POST', body: JSON.stringify(formData)}
    )

    if(result.ok) {
      onAddEvent(result.data)
      setFormData(INITIAL)
    }
    else{
      setErrors(result.data ?? {})
    }

  } 
  
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
