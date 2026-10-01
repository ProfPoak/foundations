import { useState, useEffect } from 'react'
import { useCustomerList } from '../../hooks/useCustomerList'
import { apiFetch } from '../../api'
import ErrorMessage from '../shared/ErrorMessage'
import ListStatus from '../shared/ListStatus'
import styles from '../../styles/customer/Section.module.css'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'

function TasksSection({ customerId }) {
  const {items: tasks, loading, errors, addItem, updateItem, removeItem } = useCustomerList(customerId, 'tasks')
  const [users, setUsers] = useState([])
  const [usersErrors, setUsersErrors] = useState(null)

  useEffect(() => {
    
    async function getUsers() {
      const result = await apiFetch('/users')

      if(result.ok) {
        setUsers(result.data)
      }
      else {
        setUsersErrors(result.data ?? {})
      }
    }
    getUsers()
  }, [])

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Tasks</h2>
      <ErrorMessage errors={usersErrors}/>
      <TaskForm customerId={customerId} users={users} onAddTask={addItem} />
      <ListStatus loading={loading} errors={errors} isEmpty={tasks.length === 0} emptyMessage="No tasks yet">
        <ul className={styles.list}>
          {tasks.map(task => (
            <TaskItem key={task.id} task={task} onUpdateTask={updateItem} onDeleteTask={removeItem} users={users} />
          ))}
        </ul>
      </ListStatus>
    </section>
  )
}

export default TasksSection
