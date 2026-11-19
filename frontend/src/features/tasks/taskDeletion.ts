import type { TaskSummary } from './taskApi'

type ConfirmTaskDeletion = (message: string) => boolean

/**
 * タスク削除の確認を表示し、利用者の選択結果を返す。
 *
 * @param task 対象タスク
 * @param confirm 削除確認に使用する関数
 * @returns 削除が確定された場合は`true`
 * @since 0.0.0
 */
export function confirmTaskDeletion(
  task: TaskSummary,
  confirm: ConfirmTaskDeletion = window.confirm,
): boolean {
  return confirm(`タスク「${task.taskName}」を削除しますか？`)
}
