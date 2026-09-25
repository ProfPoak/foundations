import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import SignupForm from '../components/auth/SignupForm'

function SignupPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <h1>Signup</h1>
      <SignupForm />
    </>
  )
}

export default SignupPage
