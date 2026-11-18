import { useEffect, useState } from 'react'
import { TaskRegistrationPage } from './features/tasks/TaskRegistrationPage'
import { TaskUpdatePage } from './features/tasks/TaskUpdatePage'
import { fetchTasks } from './features/tasks/taskApi'
import type { TaskSummary } from './features/tasks/taskApi'
import './App.css'

function App() {
  const [screen, setScreen] = useState<
    { type: 'list' } | { type: 'registration' } | { type: 'update'; taskId: number }
  >({ type: 'list' })
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
      {screen.type === 'registration' ? (
        <TaskRegistrationPage onBack={() => setScreen({ type: 'list' })} />
      ) : screen.type === 'update' ? (
        <TaskUpdatePage
          taskId={screen.taskId}
          onBack={() => setScreen({ type: 'list' })}
        />
      ) : (
        <section aria-labelledby="list-heading">
          <h2 id="list-heading">タスク一覧</h2>
          <button
            type="button"
            onClick={() => setScreen({ type: 'registration' })}
          >
            タスク登録
          </button>
          {error && <p role="alert">{error}</p>}
          {tasks.length === 0 ? (
            <p>タスクはありません。</p>
          ) : (
            <ul>
              {tasks.map((item) => (
                <li key={item.taskId}>
                  {item.taskName}
                  <button
                    type="button"
                    onClick={() =>
                      setScreen({ type: 'update', taskId: item.taskId })
                    }
                  >
                    編集
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}

export default App
