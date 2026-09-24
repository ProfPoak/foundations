import CustomerSearch from '../components/home/CustomerSearch'
import NewCustomerButton from '../components/home/NewCustomerButton'
import CustomerResults from '../components/home/CustomerResults'

function HomePage() {
  return (
    <>
      <h1>Customers</h1>
      <CustomerSearch />
      <NewCustomerButton />
      <CustomerResults />
    </>
  )
}

export default HomePage
