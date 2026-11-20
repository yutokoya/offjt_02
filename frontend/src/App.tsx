import { useEffect, useState } from 'react'
import { TaskRegistrationPage } from './features/tasks/TaskRegistrationPage'
import { TaskUpdatePage } from './features/tasks/TaskUpdatePage'
import type { TaskRegistrationFeedbackState } from './features/tasks/registrationFeedback'
import { deleteTask, fetchTasks } from './features/tasks/taskApi'
import type { TaskSummary } from './features/tasks/taskApi'
import {
  appendRegisteredTask,
  replaceUpdatedTask,
} from './features/tasks/taskListState'
import { confirmTaskDeletion } from './features/tasks/taskDeletion'
import type { TaskUpdateFeedbackState } from './features/tasks/updateFeedback'
import './App.css'

type TaskListProps = {
  tasks: TaskSummary[]
  onEdit: (task: TaskSummary) => void
  onDelete: (task: TaskSummary) => void
}

export function TaskList({ tasks, onEdit, onDelete }: TaskListProps) {
  return (
    <ul>
      {tasks.map((item) => (
        <li key={item.taskId}>
          {item.taskName}
          <p>担当者: {item.assigneeName || '未割当'}</p>
          <button type="button" onClick={() => onEdit(item)}>
            編集
          </button>
          <button type="button" onClick={() => onDelete(item)}>
            削除
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * タスク一覧、登録画面、更新画面の表示状態を管理する。
 *
 * @since 0.0.0
 */
function App() {
  const [screen, setScreen] = useState<
    | { type: 'list' }
    | { type: 'registration' }
    | { type: 'update'; taskId: number }
  >({ type: 'list' })
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

  const removeTask = async (task: TaskSummary) => {
    if (!confirmTaskDeletion(task)) {
      return
    }

    setMessage('')
    setError('')

    try {
      await deleteTask(task.taskId)
      setTasks((current) =>
        current.filter((item) => item.taskId !== task.taskId),
      )
      setMessage('タスクを削除しました。')
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'タスクを削除できませんでした。',
      )
    }
  }

  const handleTaskRegistered = (
    task: TaskSummary,
    feedback: TaskRegistrationFeedbackState,
  ) => {
    setTasks((current) => appendRegisteredTask(current, task))
    setMessage(feedback.message)
    setError(feedback.error)
    setScreen({ type: 'list' })
  }

  const handleTaskUpdated = (
    task: TaskSummary,
    feedback: TaskUpdateFeedbackState,
  ) => {
    setTasks((current) => replaceUpdatedTask(current, task))
    setMessage(feedback.message)
    setError(feedback.error)
    setScreen({ type: 'list' })
  }

  return (
    <main>
      <h1>タスク管理</h1>
      {screen.type === 'registration' ? (
        <TaskRegistrationPage
          onBack={() => setScreen({ type: 'list' })}
          onRegistered={handleTaskRegistered}
        />
      ) : screen.type === 'update' ? (
        <TaskUpdatePage
          taskId={screen.taskId}
          onBack={() => setScreen({ type: 'list' })}
          onUpdated={handleTaskUpdated}
        />
      ) : (
        <section aria-labelledby="list-heading">
          <h2 id="list-heading">タスク一覧</h2>
          <button
            type="button"
            onClick={() => {
              setMessage('')
              setError('')
              setScreen({ type: 'registration' })
            }}
          >
            タスク登録
          </button>
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
          {tasks.length === 0 ? (
            <p>タスクはありません。</p>
          ) : (
            <TaskList
              tasks={tasks}
              onEdit={(item) =>
                setScreen({ type: 'update', taskId: item.taskId })
              }
              onDelete={(item) => void removeTask(item)}
            />
          )}
        </section>
      )}
    </main>
  )
}

export default App
