// Props: task, users, onUpdateTask, onDeleteTask
function TaskItem({ task }) {
  return (
    <li>
      <h3>{task.title}</h3>
      <p>{task.employee.username}</p>
      {task.due_date && <p>Due {task.due_date}</p>}
      <p>{task.status}</p>
      {task.notes && <p>{task.notes}</p>}
    </li>
  )
}

export default TaskItem
