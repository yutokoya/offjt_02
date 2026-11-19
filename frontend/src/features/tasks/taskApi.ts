export type TaskRegistration = {
  taskName: string
  description: string
  assigneeName: string
  dueDate: string
}

export type TaskUpdate = Pick<
  TaskRegistration,
  'taskName' | 'description' | 'dueDate'
>

export type TaskSummary = TaskRegistration & {
  taskId: number
}

type TaskListResponse = {
  items: TaskSummary[]
}

export async function fetchTasks(): Promise<TaskSummary[]> {
  const response = await fetch('/api/tasks')
  if (!response.ok) {
    throw new Error('タスク一覧を取得できませんでした。')
  }

  const body = (await response.json()) as TaskListResponse
  return body.items
}

export async function registerTask(task: TaskRegistration): Promise<void> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'タスクを登録できませんでした。')
  }
}

export async function fetchTask(taskId: number): Promise<TaskSummary> {
  const response = await fetch(`/api/tasks/${taskId}`)
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'タスクを取得できませんでした。')
  }

  return (await response.json()) as TaskSummary
}

export async function updateTask(
  taskId: number,
  task: TaskUpdate,
): Promise<TaskSummary> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'タスクを更新できませんでした。')
  }

  return (await response.json()) as TaskSummary
}

/**
 * Deletes a task through the task API.
 *
 * @since 0.0.0
 */
export async function deleteTask(taskId: number): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'タスクを削除できませんでした。')
  }
}
