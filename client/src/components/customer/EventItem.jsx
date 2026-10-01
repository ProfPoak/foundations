import styles from './Item.module.css'

function EventItem({ event }) {
  return (
    <li className={styles.item}>
      <p className={styles.title}>{event.interaction}</p>
      <p className={styles.meta}>{new Date(event.datetime).toLocaleString()}</p>
      <p className={styles.meta}>{event.employee.username}</p>
      {event.notes && <p className={styles.body}>{event.notes}</p>}
    </li>
  )
}

export default EventItem
