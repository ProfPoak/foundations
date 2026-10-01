import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { apiFetch } from '../../api.js'
import ErrorMessage from '../shared/ErrorMessage.jsx'

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
  <li>
    <span>Username: {user.username}</span>
    <span>Id: {user.id}</span>
    {user.is_admin && <span>Admin</span>}
    {!isSelf && <button type='button' onClick={handleDelete}>Delete</button>}
    <ErrorMessage errors={errors} />
  </li>
  )
}

export default UserRow
