import ErrorMessage from './ErrorMessage'

// Props: loading, errors, isEmpty, emptyMessage, children (the list itself)
//Shows exactly one of: Loading, the errors, the empty message, or the list
function ListStatus({ loading, errors, isEmpty, emptyMessage, children }) {
  if(loading) {
    return <p>Loading...</p>
  }
  if(errors) {
    return <ErrorMessage errors={errors}/>
  }
  if(isEmpty) {
    return <p>{emptyMessage}</p>
  }
  return children
}

export default ListStatus
