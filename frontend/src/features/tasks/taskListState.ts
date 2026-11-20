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

/**
 * 更新に成功したタスクを一覧内の同じIDの項目と置き換える。
 *
 * @param tasks 現在のタスク一覧
 * @param updatedTask 更新APIが返した保存済みタスク
 * @returns 更新済みタスクを反映した一覧
 * @since 0.0.0
 */
export function replaceUpdatedTask(
  tasks: TaskSummary[],
  updatedTask: TaskSummary,
): TaskSummary[] {
  return tasks.map((task) =>
    task.taskId === updatedTask.taskId ? updatedTask : task,
  )
}
