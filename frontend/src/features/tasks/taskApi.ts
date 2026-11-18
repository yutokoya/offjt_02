export type TaskRegistration = {
  taskName: string
  description: string
  assigneeName: string
  dueDate: string
}

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
