import { useState, useEffect } from "react"
import { apiFetch } from "../services/api"
import ListStatus from '../components/shared/ListStatus'
import UserRow from "../components/admin/UserRow"
import pageStyles from '../styles/pages/Page.module.css'
import styles from '../styles/pages/AdminPage.module.css'

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
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>Admin Portal</h1>
      <ListStatus loading={loading} errors={errors} isEmpty={users.length === 0} emptyMessage={'No users'} >
        <ul className={styles.list}>
          {users.map(user => (
            <UserRow key={user.id} user={user} onDeleteUser={handleDeleteUser}/>
          ))}
        </ul>
      </ListStatus>
    </div>
  )
}

export default AdminPage
