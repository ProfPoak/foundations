

function NoteItem({ note }) {
  return (
    <li>
      <p style={{ whiteSpace: 'pre-line' }}>{note.content}</p>
      <p>{note.employee.username}</p>
      <p>{new Date(note.datetime).toLocaleString()}</p>
    </li>
  )
}

export default NoteItem
