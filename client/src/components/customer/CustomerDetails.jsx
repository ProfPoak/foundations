// Props: customer, onUpdate
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

function CustomerDetails({ customer, onUpdate }) {
  

  return (
    <section>
      <h1>{customer.full_name}</h1>
      <button aria-label="Edit customer">✏️</button>
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
