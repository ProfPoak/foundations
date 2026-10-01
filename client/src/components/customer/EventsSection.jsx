import { useCustomerList } from '../../hooks/useCustomerList'
import ListStatus from '../shared/ListStatus'
import styles from '../../styles/customer/Section.module.css'
import EventItem from './EventItem'
import EventForm from './EventForm'

function EventsSection({ customerId }) {
  const { items: events, loading, errors, addItem } = useCustomerList(customerId, 'events')

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Events</h2>
      <EventForm customerId={customerId} onAddEvent={addItem}/>
      <ListStatus loading={loading} errors={errors} isEmpty={events.length === 0} emptyMessage="No events yet">
        <ul className={styles.list}>
          {events.map(event => (
            <EventItem key={event.id} event={event}/>
          ))}
        </ul>
      </ListStatus>
    </section>
  )
}

export default EventsSection
