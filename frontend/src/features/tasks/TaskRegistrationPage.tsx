import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  submitTaskRegistration,
  type TaskRegistrationFeedbackState,
} from './registrationFeedback'
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

const emptyFeedback: TaskRegistrationFeedbackState = {
  message: '',
  error: '',
}

type TaskRegistrationFeedbackProps = TaskRegistrationFeedbackState

export function TaskRegistrationFeedback({
  message,
  error,
}: TaskRegistrationFeedbackProps) {
  return (
    <>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  )
}

export function TaskRegistrationPage({ onBack }: TaskRegistrationPageProps) {
  const [task, setTask] = useState(emptyTask)
  const [feedback, setFeedback] = useState(emptyFeedback)

  const updateTask = (field: keyof TaskRegistration, value: string) => {
    setTask((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(emptyFeedback)
    setFeedback(await submitTaskRegistration(task))
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
      <TaskRegistrationFeedback {...feedback} />
    </section>
  )
}
