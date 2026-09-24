import { useParams } from 'react-router'
import CustomerDetails from '../components/customer/CustomerDetails'
import EventsSection from '../components/customer/EventsSection'
import NotesSection from '../components/customer/NotesSection'
import TasksSection from '../components/customer/TasksSection'

function CustomerPage() {
  const { id } = useParams()

  return (
    <>
      <CustomerDetails />
      <EventsSection customerId={id} />
      <NotesSection customerId={id} />
      <TasksSection customerId={id} />
    </>
  )
}

export default CustomerPage
