// Props: errors (API error body: {error}, {errors: [...]}, or {errors: {field: [...]}})
function toMessages(errors) {
  if(errors.error) {
    return [errors.error]
  }

  if (Array.isArray(errors.errors)) {
    return errors.errors
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
    <ul>
      {messages.map(msg => <li key={msg}>{msg}</li>)}
    </ul>
  )
}

export default ErrorMessage
