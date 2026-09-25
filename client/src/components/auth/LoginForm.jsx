import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "../../context/AuthContext"
import ErrorMessage from "../shared/ErrorMessage"

function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors(null)
    const result = await login(username, password)
    if (result.ok) {
      navigate('/')
    }
    else{
      setErrors(result.data ?? {}) 
    }
  }
  
  return (
    <section>
      <h2>LoginForm</h2>
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
        <button type="submit">Log in</button>
        <ErrorMessage errors={errors} />
        <Link to="/signup">Sign Up</Link>
      </form>
    </section>
  )
}

export default LoginForm
