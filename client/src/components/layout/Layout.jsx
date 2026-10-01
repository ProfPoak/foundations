import { Outlet } from 'react-router'
import NavBar from './NavBar'
import styles from '../../styles/layout/Layout.module.css'

function Layout() {
  return (
    <>
      <NavBar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}

export default Layout
