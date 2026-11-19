import { registerTask } from './taskApi'
import type { TaskRegistration } from './taskApi'

export type TaskRegistrationFeedbackState = {
  message: string
  error: string
}

export async function submitTaskRegistration(
  task: TaskRegistration,
): Promise<TaskRegistrationFeedbackState> {
  try {
    await registerTask(task)
    return { message: 'タスクを登録しました。', error: '' }
  } catch (cause: unknown) {
    return {
      message: '',
      error:
        cause instanceof Error
          ? cause.message
          : 'タスクを登録できませんでした。',
    }
  }
}
