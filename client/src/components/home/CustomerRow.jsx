import { Link } from 'react-router'
import styles from '../../styles/home/CustomerRow.module.css'

function CustomerRow({ customer }) {
  return (
    <li className={styles.row}>
      <Link className={styles.name} to={`/customers/${customer.id}`}>{customer.full_name}</Link>
      <span className={styles.status}>Status: {customer.status} </span>
      <span className={styles.phone}>Phone: {customer.phone ?? '—'}</span>
    </li>
  )
}

export default CustomerRow
