import ErrorMessage from './ErrorMessage'
import styles from './ListStatus.module.css'

// Props: loading, errors, isEmpty, emptyMessage, children (the list itself)
//Shows exactly one of: Loading, the errors, the empty message, or the list
function ListStatus({ loading, errors, isEmpty, emptyMessage, children }) {
  if(loading) {
    return <p className={styles.status}>Loading...</p>
  }
  if(errors) {
    return <ErrorMessage errors={errors}/>
  }
  if(isEmpty) {
    return <p className={styles.status}>{emptyMessage}</p>
  }
  return children
}

export default ListStatus
