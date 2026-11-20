import { updateTask } from './taskApi'
import type { TaskSummary, TaskUpdate } from './taskApi'

export type TaskUpdateFeedbackState = {
  message: string
  error: string
}

export type TaskUpdateSubmission = {
  feedback: TaskUpdateFeedbackState
  task: TaskSummary | null
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
): Promise<TaskUpdateSubmission> {
  try {
    const updatedTask = await updateTask(taskId, task)
    return {
      feedback: {
        message: 'タスクを更新しました。',
        error: '',
      },
      task: updatedTask,
    }
  } catch (cause: unknown) {
    return {
      feedback: {
        message: '',
        error:
          cause instanceof Error
            ? cause.message
            : 'タスクを更新できませんでした。',
      },
      task: null,
    }
  }
}
