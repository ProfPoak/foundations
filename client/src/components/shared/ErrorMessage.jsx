import styles from '../../styles/shared/ErrorMessage.module.css'

// Props: errors (API error body: {error} or {errors: {field: [...]}})
function toMessages(errors) {
  if(errors.error) {
    return [errors.error]
  }

  if (typeof errors.errors === 'object' && errors.errors !== null) {
    const result = []
    
    for (const [field, messages] of Object.entries(errors.errors)) {
      for (const msg of messages) {
        result.push(`${field}: ${msg}`)
      }
    }
    
    return result
  }

  return ['Something went wrong']
}

function ErrorMessage({ errors }) {
  if (!errors) {
    return null
  }

  const messages = toMessages(errors)

  return(
    <ul className={styles.errors}>
      {messages.map(msg => <li className={styles.error} key={msg}>{msg}</li>)}
    </ul>
  )
}

export default ErrorMessage
