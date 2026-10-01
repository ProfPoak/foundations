import { useCustomerList } from '../../hooks/useCustomerList'
import ListStatus from '../shared/ListStatus'
import styles from './Section.module.css'
import NoteItem from './NoteItem'
import NoteForm from './NoteForm'

function NotesSection({ customerId }) {
  const { items: notes, loading, errors, addItem, updateItem, removeItem } = useCustomerList(customerId, 'notes')

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Notes</h2>
      <NoteForm customerId={customerId} onAddNote={addItem}/>
      <ListStatus loading={loading} errors={errors} isEmpty={notes.length === 0} emptyMessage="No notes yet">
        <ul className={styles.list}>
          {notes.map(note => (
            <NoteItem key={note.id} note={note} onUpdateNote={updateItem} onDeleteNote={removeItem}/>
          ))}
        </ul>
      </ListStatus>
    </section>
  )
}

export default NotesSection
