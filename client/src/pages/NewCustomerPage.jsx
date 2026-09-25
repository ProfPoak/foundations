import { useState } from 'react'
import { useNavigate } from 'react-router'
import { apiFetch } from '../api.js'
import CustomerForm from '../components/newCustomer/CustomerForm'
import ErrorMessage from '../components/shared/ErrorMessage.jsx'

function NewCustomerPage() {
  const navigate = useNavigate()
  const [errors, setErrors] = useState(null)
  
  async function handleSubmit(formData) {
    setErrors(null)
    const result = await apiFetch('/customers', {
      method: 'POST',
      body: JSON.stringify(formData)
    })

    if(result.ok) {
      navigate(`/customers/${result.data.id}`)
    }
    else{
      setErrors(result.data ?? {})
    }
  }

  return (
    <>
      <h1>New Customer</h1>
      <CustomerForm onSubmit={handleSubmit}/>
      <ErrorMessage errors={errors} />
    </>
  )
}

export default NewCustomerPage
