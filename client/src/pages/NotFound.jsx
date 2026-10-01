import pageStyles from './Page.module.css'

function NotFound() {
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>Page not found</h1>
    </div>
  )
}

export default NotFound
