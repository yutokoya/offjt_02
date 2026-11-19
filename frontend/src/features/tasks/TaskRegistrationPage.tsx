import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  submitTaskRegistration,
  type TaskRegistrationFeedbackState,
} from './registrationFeedback'
import type { TaskRegistration, TaskSummary } from './taskApi'

const emptyTask: TaskRegistration = {
  taskName: '',
  description: '',
  assigneeName: '',
  dueDate: '',
}

type TaskRegistrationPageProps = {
  onBack: () => void
  onRegistered: (
    task: TaskSummary,
    feedback: TaskRegistrationFeedbackState,
  ) => void
}

const emptyFeedback: TaskRegistrationFeedbackState = {
  message: '',
  error: '',
  fieldErrors: {},
}

type TaskRegistrationFeedbackProps = TaskRegistrationFeedbackState

/**
 * タスク登録の結果をステータスまたはアラートとして表示する。
 *
 * @since 0.0.0
 */
export function TaskRegistrationFeedback({
  message,
  error,
  fieldErrors,
}: TaskRegistrationFeedbackProps) {
  return (
    <>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {fieldErrors.taskName && (
        <p id="taskName-error">{fieldErrors.taskName}</p>
      )}
      {fieldErrors.dueDate && <p id="dueDate-error">{fieldErrors.dueDate}</p>}
    </>
  )
}

/**
 * タスク登録フォームと登録結果を表示する。
 *
 * @since 0.0.0
 */
export function TaskRegistrationPage({
  onBack,
  onRegistered,
}: TaskRegistrationPageProps) {
  const [task, setTask] = useState(emptyTask)
  const [feedback, setFeedback] = useState(emptyFeedback)

  const updateTask = (field: keyof TaskRegistration, value: string) => {
    setTask((current) => ({ ...current, [field]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback(emptyFeedback)
    const submission = await submitTaskRegistration(task)
    setFeedback(submission.feedback)
    if (submission.task) {
      onRegistered(submission.task, submission.feedback)
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
            aria-invalid={Boolean(feedback.fieldErrors.taskName)}
            aria-describedby={
              feedback.fieldErrors.taskName ? 'taskName-error' : undefined
            }
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
            aria-invalid={Boolean(feedback.fieldErrors.dueDate)}
            aria-describedby={
              feedback.fieldErrors.dueDate ? 'dueDate-error' : undefined
            }
            onChange={(event) => updateTask('dueDate', event.target.value)}
          />
        </label>
        <button type="submit">登録</button>
      </form>
      <TaskRegistrationFeedback {...feedback} />
    </section>
  )
}
