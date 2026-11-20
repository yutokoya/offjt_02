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
 * 説明が200 Unicodeコードポイントを超える場合にエラーを返す。
 *
 * @param description 入力された説明
 * @returns 上限超過時のエラーメッセージ。上限内なら`null`
 * @since 0.0.0
 */
export function validateTaskDescriptionLength(
  description: string,
): string | null {
  return Array.from(description).length > 200
    ? '説明は200文字以内で入力してください。'
    : null
}

/**
 * 期限日が厳密なYYYY-MM-DD形式の実在日でない場合にエラーを返す。
 *
 * @param dueDate 入力された期限日
 * @returns 不正な日付のエラーメッセージ。有効な日付なら`null`
 * @since 0.0.0
 */
export function validateDueDate(dueDate: string): string | null {
  const validationMessage =
    '期限日はYYYY-MM-DD形式の実在する日付を入力してください。'
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dueDate)) {
    return validationMessage
  }

  const year = Number(dueDate.slice(0, 4))
  const month = Number(dueDate.slice(5, 7))
  const day = Number(dueDate.slice(8, 10))
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1]
    ? null
    : validationMessage
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

  const descriptionError = validateTaskDescriptionLength(task.description)
  if (descriptionError) {
    return {
      feedback: {
        message: '',
        error: '入力内容を確認してください。',
        fieldErrors: { description: descriptionError },
      },
      task: null,
    }
  }

  const dueDateError = validateDueDate(task.dueDate)
  if (dueDateError) {
    return {
      feedback: {
        message: '',
        error: '入力内容を確認してください。',
        fieldErrors: { dueDate: dueDateError },
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
