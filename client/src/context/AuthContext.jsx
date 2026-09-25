import { createContext, useContext, useState, useEffect } from 'react'
import { apiFetch } from  '../api.js'

//Value shape: { user, token, login(username, password), signup(username, password), logout() }
const AuthContext = createContext(null)

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  //Session token check
  useEffect(() => {
    const token = localStorage.getItem('token')

    if(!token) {
      setCheckingSession(false)
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

  return <AuthContext.Provider value={ {user, checkingSession, login, signup, logout} }>{children}</AuthContext.Provider>
}

function useAuth() {
  return useContext(AuthContext)
}

export { AuthProvider, useAuth }
