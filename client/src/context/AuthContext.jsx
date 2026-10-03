import { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch, setUnauthorizedHandler } from  '../services/api.js'

const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(() => localStorage.getItem('token') !== null)

  //Session token check
  useEffect(() => {
    const token = localStorage.getItem('token')

    if(!token) {
      return
    }

    async function checkSession() {
      const {ok, data} = await apiFetch('/check_session')

      if (ok) {
        setUser(data)
      } 
      else{
        localStorage.removeItem('token')
      }
      
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  //Authentication routes
  async function authRequests(path, username, password) {
    const result = await apiFetch(path, {
      method: 'POST',
      body: JSON.stringify({ username, password})
    })

    if (result.ok) {
      localStorage.setItem('token', result.data.token)
      setUser(result.data.user)
    }
    
    return result
  }

  function login(username, password) {
    return authRequests('/login', username, password)
  }

  function signup(username, password) {
    return authRequests('/signup', username, password)
  }


  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [])

  return <AuthContext.Provider value={ {user, checkingSession, login, signup, logout} }>{children}</AuthContext.Provider>
}

function useAuth() {
  return useContext(AuthContext)
}

//The provider and its hook are kept together on purpose. Exporting a hook here only stops Vite hot-reloading this file in dev
// oxlint-disable-next-line react/only-export-components
export { AuthProvider, useAuth }
