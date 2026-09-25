import { Routes, Route } from 'react-router'

import Layout from './components/layout/Layout.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'
import AdminRoute from './components/layout/AdminRoute.jsx'

import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import NewCustomerPage from './pages/NewCustomerPage.jsx'
import CustomerPage from './pages/CustomerPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import NotFound from './pages/NotFound.jsx'


function App() {
  return (
    <Routes>
      <Route element={<Layout />} >
        <Route path='/login' element={<LoginPage />} />
        <Route path='/signup' element={<SignupPage />} />
        <Route element={<ProtectedRoute />} >
          <Route index element={<HomePage />}/>
          <Route path='/customers/new' element={<NewCustomerPage />}/>
          <Route path='/customers/:id' element={<CustomerPage />}/>
          <Route element={<AdminRoute />}>
            <Route path='/admin' element={<AdminPage />} />
          </Route>
        </Route>
        <Route path='*' element={<NotFound />}/>
      </Route>
    </Routes>
  )
}

export default App
