import { Outlet } from 'react-router'
import NavBar from './NavBar'
import styles from './Layout.module.css'

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
