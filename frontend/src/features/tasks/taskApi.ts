export type TaskRegistration = {
  taskName: string
  description: string
  assigneeName: string
  dueDate: string
}

export type TaskUpdate = Pick<
  TaskRegistration,
  'taskName' | 'description' | 'dueDate'
> & {
  assigneeName: string | null
}

/**
 * タスク一覧に表示する保存済みタスク。
 *
 * @since 0.0.0
 */
export type TaskSummary = Omit<TaskRegistration, 'assigneeName'> & {
  taskId: number
  assigneeName: string | null
}

type TaskListResponse = {
  items: TaskSummary[]
}

/**
 * 保存済みタスクの一覧を取得する。
 *
 * @returns タスク一覧
 * @since 0.0.0
 */
export async function fetchTasks(): Promise<TaskSummary[]> {
  const response = await fetch('/api/tasks')
  if (!response.ok) {
    throw new Error('タスク一覧を取得できませんでした。')
  }

  const body = (await response.json()) as TaskListResponse
  return body.items
}

/**
 * タスクを登録し、APIが返す保存済みタスクを取得する。
 *
 * @param task 登録するタスク情報
 * @returns 登録後のタスク
 * @since 0.0.0
 */
export async function registerTask(
  task: TaskRegistration,
): Promise<TaskSummary> {
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

  return (await response.json()) as TaskSummary
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
