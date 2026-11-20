import { updateTask } from './taskApi'
import type { TaskUpdate } from './taskApi'

export type TaskUpdateFeedbackState = {
  message: string
  error: string
}

/**
 * タスクを更新し、画面表示用の成功・失敗状態を返す。
 *
 * @param taskId 更新対象のタスクID
 * @param task 更新するタスク
 * @returns 更新結果の表示状態
 * @since 0.0.0
 */
export async function submitTaskUpdate(
  taskId: number,
  task: TaskUpdate,
): Promise<TaskUpdateFeedbackState> {
  try {
    await updateTask(taskId, task)
    return {
      message: 'タスクを更新しました。',
      error: '',
    }
  } catch (cause: unknown) {
    return {
      message: '',
      error:
        cause instanceof Error
          ? cause.message
          : 'タスクを更新できませんでした。',
    }
  }
}
