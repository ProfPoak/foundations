import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "../../context/AuthContext"
import ErrorMessage from "../shared/ErrorMessage"

function SignupForm() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors(null)

    if (password !== confirm) {
      setErrors({error: 'Passwords do not match'})
      return
    }

    const result = await signup(username, password)
    if (result.ok) {
      navigate('/')
    }
    else{
      setErrors(result.data ?? {}) 
    }
  }
  
  return (
    <section>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input 
          id="username" 
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)} 
        />
        <label htmlFor="password">Password</label>
        <input 
          id="password" 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)} 
        />
        <label htmlFor="confirm_password">Confirm Password</label>
        <input 
          id="confirm_password"
          type="password"
          value={confirm}
          onChange={(e)=> setConfirm(e.target.value)}
        />
        <button type="submit">Signup</button>
        <ErrorMessage errors={errors} />
        <Link to="/login">Login</Link>
      </form>
    </section>
  )
}

export default SignupForm
