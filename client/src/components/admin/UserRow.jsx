import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { apiFetch } from '../../services/api.js'
import ErrorMessage from '../shared/ErrorMessage.jsx'
import styles from '../../styles/admin/UserRow.module.css'

function UserRow({ user, onDeleteUser }) {
  const { user: currentUser } = useAuth()
  const isSelf = user.id === currentUser.id
  const [errors, setErrors] = useState()

  async function handleDelete() {
    setErrors(null)
    const result = await apiFetch(`/users/${user.id}`, { method: 'DELETE' })
    if(result.ok) {
      onDeleteUser(user.id)
    }
    else{
      setErrors(result.data ?? {})
    }
  }

  return (
  <li className={styles.row}>
    <span className={styles.username}>Username: {user.username}</span>
    <span className={styles.id}>Id: {user.id}</span>
    {user.is_admin && <span className={styles.badge}>Admin</span>}
    {!isSelf && <button className={styles.delete} type='button' onClick={handleDelete}>Delete</button>}
    <ErrorMessage errors={errors} />
  </li>
  )
}

export default UserRow
