import { Link } from 'react-router'
import styles from '../../styles/home/NewCustomerButton.module.css'

function NewCustomerButton() {
  return <Link className={styles.button} to="/customers/new">New Customer</Link>
}

export default NewCustomerButton
