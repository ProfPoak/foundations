import { useState, useEffect } from 'react'
import { apiFetch } from '../api'
import ErrorMessage from '../components/shared/ErrorMessage'
import CustomerSearch from '../components/home/CustomerSearch'
import NewCustomerButton from '../components/home/NewCustomerButton'
import CustomerResults from '../components/home/CustomerResults'

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
    return <p>Loading...</p>
  }

  if(errors) {
    return <ErrorMessage errors={errors} />
  }

  const term = search.trim().toLowerCase()
  const visible = customers.filter(customer => {
    return customer.full_name.toLowerCase().includes(term)
  })
  
  return (
    <>
      <h1>Customers</h1>
      <CustomerSearch search={search} onSearchChange={setSearch}/>
      <NewCustomerButton />
      <CustomerResults customers={visible}/>
    </>
  )
}

export default HomePage
