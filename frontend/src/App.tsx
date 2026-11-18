import { useEffect, useState } from 'react'
import { TaskRegistrationPage } from './features/tasks/TaskRegistrationPage'
import { fetchTasks } from './features/tasks/taskApi'
import type { TaskSummary } from './features/tasks/taskApi'
import './App.css'

function App() {
  const [screen, setScreen] = useState<'list' | 'registration'>('list')
  const [tasks, setTasks] = useState<TaskSummary[]>([])
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

  return (
    <main>
      <h1>タスク管理</h1>
      {screen === 'registration' ? (
        <TaskRegistrationPage onBack={() => setScreen('list')} />
      ) : (
        <section aria-labelledby="list-heading">
          <h2 id="list-heading">タスク一覧</h2>
          <button type="button" onClick={() => setScreen('registration')}>
            タスク登録
          </button>
          {error && <p role="alert">{error}</p>}
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
      )}
    </main>
  )
}

export default App
