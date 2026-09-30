
function EventItem({ event }) {
  return (
    <li>
      <p>{event.interaction}</p>
      <p>{new Date(event.datetime).toLocaleString()}</p>
      <p>{event.employee.username}</p>
      {event.notes && <p>{event.notes}</p>}
    </li>
  )
}

export default EventItem
