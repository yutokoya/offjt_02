import { useState } from 'react'
import type { FormEvent } from 'react'
import { registerTask } from './taskApi'
import type { TaskRegistration } from './taskApi'

const emptyTask: TaskRegistration = {
  taskName: '',
  description: '',
  assigneeName: '',
  dueDate: '',
}

type TaskRegistrationPageProps = {
  onBack: () => void
}

export function TaskRegistrationPage({ onBack }: TaskRegistrationPageProps) {
  const [task, setTask] = useState(emptyTask)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    <section aria-labelledby="registration-heading">
      <h2 id="registration-heading">タスク登録</h2>
      <button type="button" onClick={onBack}>
        一覧に戻る
      </button>
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
            onChange={(event) => updateTask('description', event.target.value)}
          />
        </label>
        <label>
          担当者
          <input
            value={task.assigneeName}
            onChange={(event) => updateTask('assigneeName', event.target.value)}
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
  )
}
