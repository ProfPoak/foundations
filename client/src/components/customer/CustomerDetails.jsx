import { useState, useSyncExternalStore } from "react"
import { CUSTOMER_STATUSES } from '../../constants'
import ErrorMessage from "../shared/ErrorMessage"

const fields = [
  {
    'name':'first_name',
    'label':'First name',
    'type':'text'
  },
  {
    'name':'last_name',
    'label':'Last name',
    'type':'text'
  },
  {
    'name':'status',
    'label':'Status',
  },
  {
    'name':'birthday',
    'label':'Birthday',
    'type':'date'
  },
  {
    'name':'phone',
    'label':'Phone',
    'type':'tel'
  },
  {
    'name':'email',
    'label':'Email',
    'type':'email'
  },
  {
    'name':'address',
    'label':'Address',
  }
]

const view_fields = fields.filter(field => field.name !== 'first_name' && field.name !== 'last_name')

function toFormData(customer) {
  const formatted = {}
  for (const field of fields) {
    formatted[field.name] = customer[field.name] ?? ''
  }
  return formatted
}

function CustomerDetails({ customer, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(null)
  const [errors, setErrors] = useState(null)

  function startEditing() {
    setFormData(toFormData(customer))
    setErrors(null)
    setIsEditing(true)
  }

  function handleChange(e) {
      const {name, value} = e.target
      const key = name
      const updated = { ...formData, [key]:value}
      setFormData(updated)
  }

  function inputFor(field){
    if(field.name === 'status') {
      return <select name="status" id="status" value={formData.status} onChange={handleChange} >
        {CUSTOMER_STATUSES.map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    }
    if(field.name === 'address') {
      return <textarea name="address" id="address" value={formData.address} onChange={handleChange}></textarea>
    }
    else{
      return <input
        id={field.name} 
        name={field.name} 
        type={field.type} 
        value={formData[field.name]} 
        onChange={handleChange} 
        />
    }
  }

  function handleSave(e) {
    e.preventDefault()
  }

  function handleCancel() {
    setIsEditing(false)
    setErrors(null)
  }

  if(isEditing) {
    return(
      <section>
        <h1>{customer.full_name}</h1>
        <form onSubmit={(e) => handleSave(e)} noValidate>
          <dl>
            {fields.map(field => (
              <div key={field.name}>
                <dt>
                  <label htmlFor={field.name}>{field.label}</label>
                </dt>
                <dd>
                  {inputFor(field)}
                </dd>
              </div>
            ))}
          </dl>
          <button type="submit">Save</button>
          <button type="button" onClick={handleCancel}>Cancel</button>
        </form>
      </section>
    )
  }

  return (
    <section>
      <h1>{customer.full_name}</h1>
      <button aria-label="Edit customer" onClick={startEditing}>✏️</button>
      <dl>
        {view_fields.map(field =>
          <div key={field.name}>
            <dt>{field.label}</dt>
            <dd style={{ whiteSpace: 'pre-line' }}>{customer[field.name] ?? '—'}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

export default CustomerDetails
