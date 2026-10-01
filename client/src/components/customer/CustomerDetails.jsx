import { useState } from "react"
import { CUSTOMER_STATUSES } from '../../constants'
import { useApiForm } from '../../hooks/useApiForm'
import ErrorMessage from "../shared/ErrorMessage"
import styles from "../../styles/customer/CustomerDetails.module.css"

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
  //formData starts null and is built from the current customer each time editing starts
  const { formData, setFormData, errors, setErrors, handleChange, handleSubmit: handleSave } = useApiForm({
    initial: null,
    path: `/customers/${customer.id}`,
    method: 'PATCH',
    onSuccess: updated => {
      onUpdate(updated)
      setIsEditing(false)
    },
  })

  function startEditing() {
    setFormData(toFormData(customer))
    setErrors(null)
    setIsEditing(true)
  }

  function inputFor(field){
    if(field.name === 'status') {
      return <select className={styles.input} name="status" id="status" value={formData.status} onChange={handleChange} >
        {CUSTOMER_STATUSES.map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    }
    if(field.name === 'address') {
      return <textarea className={styles.input} name="address" id="address" value={formData.address} onChange={handleChange}></textarea>
    }
    else{
      return <input
        className={styles.input}
        id={field.name} 
        name={field.name} 
        type={field.type} 
        value={formData[field.name]} 
        onChange={handleChange} 
        />
    }
  }

  function handleCancel() {
    setIsEditing(false)
    setErrors(null)
  }

  if(isEditing) {
    return(
      <section className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{customer.full_name}</h1>
        </div>
        <form className={styles.form} onSubmit={handleSave} noValidate>
          <dl className={styles.details}>
            {fields.map(field => (
              <div className={styles.row} key={field.name}>
                <dt className={styles.term}>
                  <label htmlFor={field.name}>{field.label}</label>
                </dt>
                <dd className={styles.value}>
                  {inputFor(field)}
                </dd>
              </div>
            ))}
          </dl>
          <div className={styles.actions}>
            <button className={styles.button} type="submit">Save</button>
            <button className={styles.button} type="button" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
        <ErrorMessage errors={errors} />
      </section>
    )
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>{customer.full_name}</h1>
        <button className={styles.editButton} aria-label="Edit customer" onClick={startEditing}>✏️</button>
      </div>
      <dl className={styles.details}>
        {view_fields.map(field =>
          <div className={styles.row} key={field.name}>
            <dt className={styles.term}>{field.label}</dt>
            <dd className={styles.value} style={{ whiteSpace: 'pre-line' }}>{customer[field.name] ?? '—'}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

export default CustomerDetails
