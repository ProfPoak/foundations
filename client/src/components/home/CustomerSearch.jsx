// Props: search, onSearchChange
function CustomerSearch({ search, onSearchChange }) {
  return (
    <section>
      <label htmlFor="search">Search customers</label>
      <input 
        id="search" 
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        />
    </section>
  )
}

export default CustomerSearch
