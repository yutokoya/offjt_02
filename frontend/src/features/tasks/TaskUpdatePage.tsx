import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchTask } from './taskApi'
import type { TaskSummary, TaskUpdate } from './taskApi'
import {
  submitTaskUpdate,
  type TaskUpdateFeedbackState,
} from './updateFeedback'

type TaskLoadState = {
  taskId: number
  task: TaskUpdate | null
  error: string
}

type TaskUpdatePageProps = {
  taskId: number
  onBack: () => void
  onUpdated: (task: TaskSummary, feedback: TaskUpdateFeedbackState) => void
}

export function TaskUpdatePage({
  taskId,
  onBack,
  onUpdated,
}: TaskUpdatePageProps) {
  const [loadedTask, setLoadedTask] = useState<TaskLoadState>({
    taskId,
    task: null,
    error: '',
  })
  const [feedback, setFeedback] = useState<TaskUpdateFeedbackState>({
    message: '',
    error: '',
  })
  const currentLoad =
    loadedTask.taskId === taskId
      ? loadedTask
      : { taskId, task: null, error: '' }
  const task = currentLoad.task

  useEffect(() => {
    let active = true
    void fetchTask(taskId)
      .then((current: TaskSummary) => {
        if (active) {
          setLoadedTask({
            taskId,
            task: {
              taskName: current.taskName,
              description: current.description,
              assigneeName: current.assigneeName,
              dueDate: current.dueDate,
            },
            error: '',
          })
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setLoadedTask({
            taskId,
            task: null,
            error:
              cause instanceof Error
                ? cause.message
                : 'タスクを取得できませんでした。',
          })
        }
      })
    return () => {
      active = false
    }
  }, [taskId])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback({ message: '', error: '' })
    if (!task) {
      return
    }

    const submission = await submitTaskUpdate(taskId, task)
    setFeedback(submission.feedback)
    if (submission.task) {
      onUpdated(submission.task, submission.feedback)
    }
  }

  const updateField = (field: keyof TaskUpdate, value: string) => {
    setLoadedTask((current) =>
      current.taskId === taskId && current.task
        ? {
            ...current,
            task: { ...current.task, [field]: value },
          }
        : current,
    )
  }

  return (
    <section aria-labelledby="update-heading">
      <h2 id="update-heading">タスク更新</h2>
      <button type="button" onClick={onBack}>
        一覧に戻る
      </button>
      {task ? (
        <TaskUpdateForm task={task} onChange={updateField} onSubmit={submit} />
      ) : (
        !currentLoad.error && <p>タスクを取得しています。</p>
      )}
      <TaskUpdateFeedback {...feedback} />
      {currentLoad.error && <p role="alert">{currentLoad.error}</p>}
    </section>
  )
}

type TaskUpdateFeedbackProps = TaskUpdateFeedbackState

export function TaskUpdateFeedback({
  message,
  error,
}: TaskUpdateFeedbackProps) {
  return (
    <>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  )
}

type TaskUpdateFormProps = {
  task: TaskUpdate
  onChange: (field: keyof TaskUpdate, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TaskUpdateForm({
  task,
  onChange,
  onSubmit,
}: TaskUpdateFormProps) {
  return (
    <form onSubmit={onSubmit}>
      <label>
        タスク名
        <input
          value={task.taskName}
          onChange={(event) => onChange('taskName', event.target.value)}
        />
      </label>
      <label>
        説明
        <textarea
          value={task.description}
          onChange={(event) => onChange('description', event.target.value)}
        />
      </label>
      <p>担当者: {task.assigneeName ?? '未割当'}</p>
      <label>
        期限日
        <input
          type="date"
          value={task.dueDate}
          onChange={(event) => onChange('dueDate', event.target.value)}
        />
      </label>
      <button type="submit">更新</button>
    </form>
  )
}
