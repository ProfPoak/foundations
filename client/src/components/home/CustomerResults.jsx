import CustomerRow from "./CustomerRow"

function CustomerResults({ customers }) {
  if(customers.length === 0) {
    return <p>No customers found</p>
  }
  
  return (
    <ul>
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
