import { registerTask } from './taskApi'
import { TaskApiError } from './taskApi'
import type { TaskFieldErrors, TaskRegistration, TaskSummary } from './taskApi'

function isJavaWhitespace(character: string | undefined): boolean {
  const codePoint = character?.codePointAt(0)
  return (
    codePoint !== undefined &&
    ((codePoint >= 0x0009 && codePoint <= 0x000d) ||
      (codePoint >= 0x001c && codePoint <= 0x0020) ||
      codePoint === 0x1680 ||
      (codePoint >= 0x2000 && codePoint <= 0x2006) ||
      (codePoint >= 0x2008 && codePoint <= 0x200a) ||
      codePoint === 0x2028 ||
      codePoint === 0x2029 ||
      codePoint === 0x205f ||
      codePoint === 0x3000)
  )
}

/**
 * タスク登録結果を画面に表示するための状態。
 *
 * @since 0.0.0
 */
export type TaskRegistrationFeedbackState = {
  message: string
  error: string
  fieldErrors: TaskFieldErrors
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
 * 前後のJava Unicode空白を除去したタスク名が100コードポイントを超える場合にエラーを返す。
 *
 * @param taskName 入力されたタスク名
 * @returns 上限超過時のエラーメッセージ。上限内なら`null`
 * @since 0.0.0
 */
export function validateTaskNameLength(taskName: string): string | null {
  const codePoints = Array.from(taskName)
  let start = 0
  let end = codePoints.length

  while (start < end && isJavaWhitespace(codePoints[start])) {
    start += 1
  }
  while (end > start && isJavaWhitespace(codePoints[end - 1])) {
    end -= 1
  }

  return end - start > 100 ? 'タスク名は100文字以内で入力してください。' : null
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
  const taskNameError = validateTaskNameLength(task.taskName)
  if (taskNameError) {
    return {
      feedback: {
        message: '',
        error: '入力内容を確認してください。',
        fieldErrors: { taskName: taskNameError },
      },
      task: null,
    }
  }

  try {
    const registeredTask = await registerTask(task)
    return {
      feedback: {
        message: 'タスクを登録しました。',
        error: '',
        fieldErrors: {},
      },
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
        fieldErrors: cause instanceof TaskApiError ? cause.fieldErrors : {},
      },
      task: null,
    }
  }
}
