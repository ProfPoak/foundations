import { useState, useEffect } from 'react'
import { apiFetch } from '../services/api'

//Loads one of a customer's lists (e.g. 'events', 'notes') and keeps it in sync after
//POST / PATCH / DELETE without refetching. The server sends lists newest first
export function useCustomerList(customerId, resource) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(null)

  useEffect(() => {
    async function getItems() {
      const result = await apiFetch(`/customers/${customerId}/${resource}`)
      if(result.ok) {
        setItems(result.data)
      }
      else{
        setErrors(result.data ?? {})
      }
      setLoading(false)
    }
    getItems()
  }, [customerId, resource])

  //Updater functions read the latest list, so back-to-back changes never drop one
  function addItem(created) {
    setItems(current => [created, ...current])
  }

  function updateItem(updated) {
    setItems(current => current.map(item => item.id === updated.id ? updated : item))
  }

  function removeItem(id) {
    setItems(current => current.filter(item => item.id !== id))
  }

  return { items, loading, errors, addItem, updateItem, removeItem }
}
