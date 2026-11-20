import { deleteTask } from './taskApi'

export type TaskDeletionFeedbackState = {
  message: string
  error: string
}

/**
 * タスクを削除し、画面表示用の成功・失敗状態を返す。
 *
 * @param taskId 削除対象のタスクID
 * @returns 削除結果の表示状態
 * @since 0.0.0
 */
export async function submitTaskDeletion(
  taskId: number,
): Promise<TaskDeletionFeedbackState> {
  try {
    await deleteTask(taskId)
    return {
      message: 'タスクを削除しました。',
      error: '',
    }
  } catch (cause: unknown) {
    return {
      message: '',
      error:
        cause instanceof Error
          ? cause.message
          : 'タスクを削除できませんでした。',
    }
  }
}
