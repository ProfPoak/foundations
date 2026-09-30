import { useState, useEffect } from 'react'
import { apiFetch } from '../../api'
import ErrorMessage from '../shared/ErrorMessage'
import EventItem from './EventItem'
import EventForm from './EventForm'

// Props: customerId
function EventsSection({ customerId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(null)

  useEffect(() => {
    async function getEvents(){
      const result = await apiFetch(`/customers/${customerId}/events`)
      if(result.ok) {
        setEvents(result.data)
      }
      else{
        setErrors(result.data ?? {})
      }
      setLoading(false)
    }
    getEvents()
  }, [customerId])

  function renderList(events) {
    if(loading) {
      return <p>Loading...</p>
    }
    else if(errors) {
      return <ErrorMessage errors={errors}/>
    }
    else if(events.length === 0) {
      return <p>No events yet</p>
    }
    return <ul>
      {events.map(event => (
        <EventItem key={event.id} event={event}/>
      ))}
    </ul>
  }

  return (
    <section>
      <h2>Events</h2>
      <EventForm />
      {renderList(events)}
    </section>
  )
}

export default EventsSection
