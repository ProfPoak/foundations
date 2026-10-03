import { useState } from 'react'
import { apiFetch } from '../services/api'

//The shared state and submit logic for any form that sends its own request.
//The form keeps its own markup; it wires up formData, handleChange, handleSubmit and errors.
//  initial         the starting formData (every value '' or a real option, never undefined)
//  path, method    where to send formData, e.g. `/customers/${id}/events`, 'POST'
//  onSuccess       gets the server's data when the request is ok
//  resetOnSuccess  true for "add" forms, so the form is ready for the next one
export function useApiForm({ initial, path, method, onSuccess, resetOnSuccess = false }) {
  const [formData, setFormData] = useState(initial)
  const [errors, setErrors] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(current => ({ ...current, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors(null)

    const result = await apiFetch(path, { method, body: JSON.stringify(formData) })

    if(result.ok) {
      onSuccess(result.data)
      if(resetOnSuccess) {
        setFormData(initial)
      }
    }
    else{
      setErrors(result.data ?? {})
    }
  }

  return { formData, setFormData, errors, setErrors, handleChange, handleSubmit }
}
