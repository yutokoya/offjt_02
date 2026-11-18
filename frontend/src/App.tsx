import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchTasks, registerTask } from './features/tasks/taskApi'
import type { TaskRegistration, TaskSummary } from './features/tasks/taskApi'
import './App.css'

const emptyTask: TaskRegistration = {
  taskName: '',
  description: '',
  assigneeName: '',
  dueDate: '',
}

function App() {
  const [task, setTask] = useState(emptyTask)
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchTasks()
      .then(setTasks)
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : 'タスク一覧を取得できませんでした。',
        )
      })
  }, [])

  const updateTask = (field: keyof TaskRegistration, value: string) => {
    setTask((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await registerTask(task)
      setMessage('タスク登録処理を呼び出しました。')
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'タスクを登録できませんでした。',
      )
    }
  }

  return (
    <main>
      <h1>タスク管理</h1>
      <section aria-labelledby="registration-heading">
        <h2 id="registration-heading">タスク登録</h2>
        <form onSubmit={submit}>
          <label>
            タスク名
            <input
              value={task.taskName}
              onChange={(event) => updateTask('taskName', event.target.value)}
            />
          </label>
          <label>
            説明
            <textarea
              value={task.description}
              onChange={(event) =>
                updateTask('description', event.target.value)
              }
            />
          </label>
          <label>
            担当者
            <input
              value={task.assigneeName}
              onChange={(event) =>
                updateTask('assigneeName', event.target.value)
              }
            />
          </label>
          <label>
            期限日
            <input
              type="date"
              value={task.dueDate}
              onChange={(event) => updateTask('dueDate', event.target.value)}
            />
          </label>
          <button type="submit">登録</button>
        </form>
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
      </section>

      <section aria-labelledby="list-heading">
        <h2 id="list-heading">タスク一覧</h2>
        {tasks.length === 0 ? (
          <p>タスクはありません。</p>
        ) : (
          <ul>
            {tasks.map((item) => (
              <li key={item.taskId}>{item.taskName}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App
