import { registerTask } from './taskApi'
import type { TaskRegistration, TaskSummary } from './taskApi'

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
 * 登録処理のフィードバックと、成功時にAPIから返されたタスク。
 *
 * @since 0.0.0
 */
export type TaskRegistrationSubmission = {
  feedback: TaskRegistrationFeedbackState
  task: TaskSummary | null
}

/**
 * タスクを登録し、画面表示用の結果と保存済みタスクを返す。
 *
 * @param task 登録するタスク
 * @returns 登録結果と、成功時の保存済みタスク
 * @since 0.0.0
 */
export async function submitTaskRegistration(
  task: TaskRegistration,
): Promise<TaskRegistrationSubmission> {
  try {
    const registeredTask = await registerTask(task)
    return {
      feedback: { message: 'タスクを登録しました。', error: '' },
      task: registeredTask,
    }
  } catch (cause: unknown) {
    return {
      feedback: {
        message: '',
        error:
          cause instanceof Error
            ? cause.message
            : 'タスクを登録できませんでした。',
      },
      task: null,
    }
  }
}
