import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import ErrorMessage from '../components/shared/ErrorMessage'
import CustomerSearch from '../components/home/CustomerSearch'
import NewCustomerButton from '../components/home/NewCustomerButton'
import CustomerResults from '../components/home/CustomerResults'
import pageStyles from './Page.module.css'
import styles from './HomePage.module.css'

function HomePage() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(null)

  useEffect(() => {
    async function getCustomers() {
      const result = await apiFetch('/customers')
      if(result.ok) {
        setCustomers(result.data)
      }
      else{
        setErrors(result.data ?? {})
      }
      setLoading(false)
    }

    getCustomers()
  },[])

  if(loading) {
    return <p className={pageStyles.message}>Loading...</p>
  }

  if(errors) {
    return <ErrorMessage errors={errors} />
  }

  const term = search.trim().toLowerCase()
  const visible = customers.filter(customer => {
    return customer.full_name.toLowerCase().includes(term)
  })
  
  return (
    <div className={pageStyles.page}>
      <div className={styles.header}>
        <h1 className={pageStyles.title}>Customers</h1>
        <NewCustomerButton />
      </div>
      <div className={styles.toolbar}>
        <CustomerSearch search={search} onSearchChange={setSearch}/>
      </div>
      <CustomerResults customers={visible}/>
    </div>
  )
}

export default HomePage
