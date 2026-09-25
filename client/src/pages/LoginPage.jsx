import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import LoginForm from '../components/auth/LoginForm'

function LoginPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <h1>Login</h1>
      <LoginForm />
    </>
  )
}

export default LoginPage
