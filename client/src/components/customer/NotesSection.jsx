import { useCustomerList } from '../../hooks/useCustomerList'
import ListStatus from '../shared/ListStatus'
import NoteItem from './NoteItem'
import NoteForm from './NoteForm'

function NotesSection({ customerId }) {
  const { items: notes, loading, errors, addItem } = useCustomerList(customerId, 'notes')

  return (
    <section>
      <h2>Notes</h2>
      <NoteForm customerId={customerId} onAddNote={addItem}/>
      <ListStatus loading={loading} errors={errors} isEmpty={notes.length === 0} emptyMessage="No notes yet">
        <ul>
          {notes.map(note => (
            <NoteItem key={note.id} note={note}/>
          ))}
        </ul>
      </ListStatus>
    </section>
  )
}

export default NotesSection
