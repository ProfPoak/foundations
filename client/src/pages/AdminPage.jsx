import { useState, useEffect } from "react"
import { apiFetch } from "../api"
import ListStatus from '../components/shared/ListStatus'
import UserRow from "../components/admin/UserRow"

function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState(null)
  
  useEffect(() => {
    async function getUsers() {
      const result = await apiFetch('/users')
      if(result.ok) {
        setUsers(result.data)
      }
      else{
        setErrors(result.data ?? {})
      }
      setLoading(false)
    }

    getUsers()
  }, [])

  function handleDeleteUser(id){
    setUsers(current => current.filter(item => item.id !== id))
  }

  return (
    <>
      <h1>Admin Portal</h1>
      <ListStatus loading={loading} errors={errors} isEmpty={users.length === 0} emptyMessage={'No users'} >
        <ul>
          {users.map(user => (
            <UserRow key={user.id} user={user} onDeleteUser={handleDeleteUser}/>
          ))}
        </ul>
      </ListStatus>
    </>
  )
}

export default AdminPage
