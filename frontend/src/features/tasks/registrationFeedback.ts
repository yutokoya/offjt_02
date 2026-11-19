import { registerTask } from './taskApi'
import type { TaskRegistration } from './taskApi'

/**
 * タスク登録結果を画面に表示するための状態。
 *
 * @since 0.0.0
 */
export type TaskRegistrationFeedbackState = {
  message: string
  error: string
}

/**
 * タスクを登録し、結果を画面表示用のフィードバック状態に変換する。
 *
 * @param task 登録するタスク
 * @returns 登録成功メッセージまたはエラーメッセージ
 * @since 0.0.0
 */
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
