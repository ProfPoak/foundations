import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/auth/LoginForm'
import pageStyles from '../styles/pages/Page.module.css'

function LoginPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className={`${pageStyles.page} ${pageStyles.centered}`}>
      <h1 className={pageStyles.title}>Login</h1>
      <LoginForm />
    </div>
  )
}

export default LoginPage
