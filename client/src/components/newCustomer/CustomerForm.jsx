import { useState } from "react"
import { CUSTOMER_STATUSES } from "../../constants"

const INITIAL = {
  'first_name': '',
  'last_name': '',
  'birthday': '',
  'phone': '',
  'email': '',
  'address': '',
  'status': 'potential'
}

function CustomerForm({ onSubmit }) {
  const [formData, setFormData] = useState(INITIAL)

  function handleChange(event) {
    const {name, value} = event.target
    const customer = formData
    const key = name
    const updated = { ...customer, [key]:value}
    setFormData(updated)
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(formData)
  }
  
  return (
    <form onSubmit={e => handleSubmit(e)} noValidate>
      <label htmlFor="first_name">First name</label>
      <input 
        id="first_name"
        type="text"
        name="first_name"
        value={formData.first_name}
        onChange={e => handleChange(e)}
      />
      
      <label htmlFor="last_name">Last name</label>
      <input 
        id="last_name"
        type="text"
        name="last_name"
        value={formData.last_name}
        onChange={e => handleChange(e)}
      />
     
      <label htmlFor="birthday">Birthday</label>
      <input 
        id="birthday"
        type="date"
        name="birthday"
        min="1900-01-01"
        max={new Date().toISOString().slice(0, 10)}
        value={formData.birthday}
        onChange={e => handleChange(e)}
      />
      
      <label htmlFor="phone">Phone</label>
      <input 
        id="phone"
        type="tel"
        name="phone"
        value={formData.phone}
        onChange={e => handleChange(e)}
      />
      
      <label htmlFor="email">Email</label>
      <input 
        id="email"
        type="email"
        name="email"
        value={formData.email}
        onChange={e => handleChange(e)}
      />

      <label htmlFor="address">Address</label>
      <input 
        id="address"
        type="text"
        name="address"
        value={formData.address}
        onChange={e => handleChange(e)}
      />
      
      <label htmlFor="status">Status</label>
      <select name="status" id="status" value={formData.status} onChange={e => handleChange(e)}>
        {CUSTOMER_STATUSES.map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <button type="submit">Create Customer</button>
    </form>
  )
}

export default CustomerForm
