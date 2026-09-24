import { createContext, useContext } from 'react'

//Value shape: { user, token, login(username, password), signup(username, password), logout() }
const AuthContext = createContext(null)

function AuthProvider({ children }) {
  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>
}

function useAuth() {
  return useContext(AuthContext)
}

export { AuthProvider, useAuth }
