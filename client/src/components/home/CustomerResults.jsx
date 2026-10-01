import CustomerRow from "./CustomerRow"
import styles from "../../styles/home/CustomerResults.module.css"

function CustomerResults({ customers }) {
  if(customers.length === 0) {
    return <p className={styles.empty}>No customers found</p>
  }
  
  return (
    <ul className={styles.list}>
      {customers.map(customer => (
        <CustomerRow 
        key={customer.id}
        customer={customer}
        />
      ))}
    </ul>
  )
}

export default CustomerResults
