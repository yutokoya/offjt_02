import { updateTask } from './taskApi'
import { TaskApiError } from './taskApi'
import type { TaskFieldErrors, TaskSummary, TaskUpdate } from './taskApi'
import { validateTaskNameLength } from './registrationFeedback'

export type TaskUpdateFeedbackState = {
  message: string
  error: string
  fieldErrors: TaskFieldErrors
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
  const fieldErrors: TaskFieldErrors = {}
  if (!task.taskName.trim()) {
    fieldErrors.taskName = 'タスク名は必須です。'
  } else {
    const taskNameLengthError = validateTaskNameLength(task.taskName)
    if (taskNameLengthError) {
      fieldErrors.taskName = taskNameLengthError
    }
  }
  if (!task.dueDate.trim()) {
    fieldErrors.dueDate = '期限日は必須です。'
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      feedback: {
        message: '',
        error: '入力内容を確認してください。',
        fieldErrors,
      },
      task: null,
    }
  }

  try {
    const updatedTask = await updateTask(taskId, task)
    return {
      feedback: {
        message: 'タスクを更新しました。',
        error: '',
        fieldErrors: {},
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
        fieldErrors: cause instanceof TaskApiError ? cause.fieldErrors : {},
      },
      task: null,
    }
  }
}
