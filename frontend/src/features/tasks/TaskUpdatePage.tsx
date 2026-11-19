import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchTask, updateTask } from './taskApi'
import type { TaskSummary, TaskUpdate } from './taskApi'

type TaskUpdatePageProps = {
  taskId: number
  onBack: () => void
}

export function TaskUpdatePage({ taskId, onBack }: TaskUpdatePageProps) {
  const [task, setTask] = useState<TaskUpdate>({
    taskName: '',
    description: '',
    dueDate: '',
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchTask(taskId)
      .then((current: TaskSummary) =>
        setTask({
          taskName: current.taskName,
          description: current.description,
          dueDate: current.dueDate,
        }),
      )
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : 'タスクを取得できませんでした。',
        )
      })
  }, [taskId])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await updateTask(taskId, task)
      setMessage('タスク更新処理を呼び出しました。')
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'タスクを更新できませんでした。',
      )
    }
  }

  const updateField = (field: keyof TaskUpdate, value: string) => {
    setTask((current) => ({ ...current, [field]: value }))
  }

  return (
    <section aria-labelledby="update-heading">
      <h2 id="update-heading">タスク更新</h2>
      <button type="button" onClick={onBack}>
        一覧に戻る
      </button>
      <form onSubmit={submit}>
        <label>
          タスク名
          <input
            value={task.taskName}
            onChange={(event) => updateField('taskName', event.target.value)}
          />
        </label>
        <label>
          説明
          <textarea
            value={task.description}
            onChange={(event) => updateField('description', event.target.value)}
          />
        </label>
        <label>
          期限日
          <input
            type="date"
            value={task.dueDate}
            onChange={(event) => updateField('dueDate', event.target.value)}
          />
        </label>
        <button type="submit">更新</button>
      </form>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  )
}
