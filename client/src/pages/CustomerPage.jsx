import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { apiFetch } from '../services/api'
import ErrorMessage from '../components/shared/ErrorMessage'
import CustomerDetails from '../components/customer/CustomerDetails'
import EventsSection from '../components/customer/EventsSection'
import NotesSection from '../components/customer/NotesSection'
import TasksSection from '../components/customer/TasksSection'
import pageStyles from '../styles/pages/Page.module.css'
import styles from '../styles/pages/CustomerPage.module.css'

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
  
  if(loading) {return <p className={pageStyles.message}>Loading...</p>}

  if(notFound) { 
    return (
      <div className={pageStyles.page}>
        <p className={pageStyles.message}>Customer not found</p>
        <Link to='/' className={styles.back}>Back</Link>
      </div>
  )}

  if(errors) {return <ErrorMessage errors={errors} />}
  return (
    <div className={pageStyles.page}>
      <CustomerDetails customer={customer} onUpdate={setCustomer}/>
      <div className={styles.sections}>
        <EventsSection customerId={id} />
        <NotesSection customerId={id} />
        <TasksSection customerId={id} />
      </div>
    </div>
  )
}

export default CustomerPage
