import NoteForm from './NoteForm'

// Props: customerId
function NotesSection() {
  return (
    <section>
      <h2>Notes</h2>
      <NoteForm />
      <ul></ul>
    </section>
  )
}

export default NotesSection
