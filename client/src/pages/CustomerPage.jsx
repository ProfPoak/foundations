import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { apiFetch } from '../api'
import ErrorMessage from '../components/shared/ErrorMessage'
import CustomerDetails from '../components/customer/CustomerDetails'
import EventsSection from '../components/customer/EventsSection'
import NotesSection from '../components/customer/NotesSection'
import TasksSection from '../components/customer/TasksSection'

function CustomerPage() {
  const { id } = useParams()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [errors, setErrors] = useState(null)

  useEffect(() => {
    async function getCustomer(id) {
      setLoading(true)
      setNotFound(false)
      setErrors(null)
      
      const result = await apiFetch(`/customers/${id}`)

      if(result.ok) {
        setCustomer(result.data)
      }
      else if(result.status === 404) {
        setNotFound(true)
      }
      else{
        setErrors(result.data ?? {})
      }
      
      setLoading(false)
    }

    getCustomer(id)
  }, [id])
  
  if(loading) {return <p>Loading...</p>}

  if(notFound) { 
    return (
      <>
        <p>Customer not found</p>
        <Link to='/'>Back</Link>
      </>
  )}

  if(errors) {return <ErrorMessage errors={errors} />}
  return (
    <>
      <CustomerDetails customer={customer} onUpdate={setCustomer}/>
      <EventsSection customerId={id} />
      <NotesSection customerId={id} />
      <TasksSection customerId={id} />
    </>
  )
}

export default CustomerPage
