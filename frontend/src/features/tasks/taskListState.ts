import type { TaskSummary } from './taskApi'

/**
 * 登録に成功したタスクを現在の一覧へ追加する。
 *
 * @param tasks 現在のタスク一覧
 * @param registeredTask 登録APIが返した保存済みタスク
 * @returns 登録済みタスクを含む一覧
 * @since 0.0.0
 */
export function appendRegisteredTask(
  tasks: TaskSummary[],
  registeredTask: TaskSummary,
): TaskSummary[] {
  return [...tasks, registeredTask]
}
