import { Link } from 'react-router'

function CustomerRow({ customer }) {
  return (
<li>
  <Link to={`/customers/${customer.id}`}>{customer.full_name}</Link>
  <span>Status: {customer.status} </span>
  <span>{customer.phone ?? '—'}</span>
</li>
  )
}

export default CustomerRow
