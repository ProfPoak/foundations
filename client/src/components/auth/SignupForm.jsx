import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { useAuth } from "../../context/AuthContext"
import ErrorMessage from "../shared/ErrorMessage"
import styles from "../../styles/auth/AuthForm.module.css"

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
    <section className={styles.card}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="username">Username</label>
          <input 
            id="username" 
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)} 
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input 
            id="password" 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} 
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirm_password">Confirm Password</label>
          <input 
            id="confirm_password"
            type="password"
            value={confirm}
            onChange={(e)=> setConfirm(e.target.value)}
            className={styles.input}
          />
        </div>
        <button className={styles.submit} type="submit">Signup</button>
        <ErrorMessage errors={errors} />
        <Link className={styles.switch} to="/login">Login</Link>
      </form>
    </section>
  )
}

export default SignupForm
