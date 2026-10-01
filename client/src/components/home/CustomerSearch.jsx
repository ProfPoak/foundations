import styles from './CustomerSearch.module.css'

// Props: search, onSearchChange
function CustomerSearch({ search, onSearchChange }) {
  return (
    <section className={styles.search}>
      <label className={styles.label} htmlFor="search">Search customers</label>
      <input 
        id="search" 
        className={styles.input}
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        />
    </section>
  )
}

export default CustomerSearch
