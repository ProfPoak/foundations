import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import SignupForm from '../components/auth/SignupForm'
import pageStyles from './Page.module.css'

function SignupPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>Signup</h1>
      <SignupForm />
    </div>
  )
}

export default SignupPage
