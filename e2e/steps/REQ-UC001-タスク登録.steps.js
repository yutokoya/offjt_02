import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import {
  assigneeInput,
  descriptionInput,
  dueDateInput,
  fetchTaskList,
  openRegistration,
  submitRegistration,
  taskNameInput,
} from '../support/task-page.js'

async function fetchPersistedTasks(world) {
  const response = await world.context.request.get(
    new URL('/api/tasks', world.baseUrl).toString(),
  )
  assert.equal(
    response.status(),
    200,
    `タスク一覧APIがHTTP ${response.status()}を返しました`,
  )
  const body = await response.json()
  assert.ok(Array.isArray(body.items), 'タスク一覧APIの応答形式が不正です')
  return body.items
}

Given('タスク一覧に登録済みタスクが存在しない', async function () {
  assert.equal(this.mockEmptyTaskList, true)
  assert.equal(await this.page.getByRole('listitem').count(), 0)
})

When('タスク登録画面を表示する', async function () {
  await this.page
    .getByRole('button', { name: 'タスク登録', exact: true })
    .click()
})

When(
  /^タスク名「(.+)」と期限日「(.+)」を入力して登録する$/,
  async function (name, dueDate) {
    await openRegistration(this.page)
    this.currentTaskName = name
    this.expectedDueDate = dueDate
    await taskNameInput(this.page).fill(name)
    await dueDateInput(this.page).fill(dueDate)
    await submitRegistration(this)
  },
)

When(/^(.+) に (.+) を指定して登録する$/, async function (field, inputValue) {
  await openRegistration(this.page)
  this.persistedTasksBeforeRegistration = await fetchPersistedTasks(this)
  this.currentTaskName = `入力検証-${Date.now()}`
  await taskNameInput(this.page).fill(this.currentTaskName)
  await dueDateInput(this.page).fill('2026-12-01')

  const value = inputValue === '未入力' ? '' : '   '
  if (field === 'タスク名') {
    await taskNameInput(this.page).fill(value)
  } else {
    await dueDateInput(this.page).fill('')
  }
  await submitRegistration(this)
})

When(
  /^前後空白除去後(\d+) Unicodeコードポイントのタスク名で登録する$/,
  async function (length) {
    await openRegistration(this.page)
    this.currentTaskName = '😀'.repeat(Number(length))
    this.expectedDueDate = '2026-12-01'
    await taskNameInput(this.page).fill(`  ${this.currentTaskName}  `)
    await dueDateInput(this.page).fill('2026-12-01')
    await submitRegistration(this)
  },
)

When(
  /^説明が(\d+) Unicodeコードポイントのタスクを登録する$/,
  async function (length) {
    await openRegistration(this.page)
    this.currentTaskName = `説明検証-${Date.now()}`
    this.expectedDueDate = '2026-12-01'
    await taskNameInput(this.page).fill(this.currentTaskName)
    await descriptionInput(this.page).fill('😀'.repeat(Number(length)))
    await dueDateInput(this.page).fill('2026-12-01')
    await submitRegistration(this)
  },
)

When(/^期限日に「(.+)」を指定して登録する$/, async function (date) {
  await openRegistration(this.page)
  this.currentTaskName = `日付検証-${Date.now()}`
  this.invalidDueDate = date
  await taskNameInput(this.page).fill(this.currentTaskName)
  await dueDateInput(this.page).fill(date)
  await submitRegistration(this)
  assert.equal(this.rewrittenDueDate, date)
})

When(/^担当者「(.+)」を指定してタスクを登録する$/, async function (assignee) {
  await openRegistration(this.page)
  this.currentTaskName = `担当者検証-${Date.now()}`
  this.expectedAssignee = assignee
  this.expectedDueDate = '2026-12-01'
  await taskNameInput(this.page).fill(this.currentTaskName)
  await dueDateInput(this.page).fill('2026-12-01')
  await assigneeInput(this.page).fill(assignee)
  await submitRegistration(this)
})

When('担当者を指定せずにタスクを登録する', async function () {
  await openRegistration(this.page)
  this.currentTaskName = `担当者未設定-${Date.now()}`
  this.expectedAssignee = null
  this.expectedDueDate = '2026-12-01'
  await taskNameInput(this.page).fill(this.currentTaskName)
  await dueDateInput(this.page).fill('2026-12-01')
  await submitRegistration(this)
})

Then('タスク名、説明、担当者、期限日の入力欄が表示される', async function () {
  for (const locator of [
    taskNameInput(this.page),
    descriptionInput(this.page),
    assigneeInput(this.page),
    dueDateInput(this.page),
  ]) {
    assert.equal(await locator.isVisible(), true)
  }
})

Then('タスク情報が保存される', async function () {
  assert.ok(this.lastPostResponse, 'タスク登録リクエストが送信されていません')
  assert.ok(
    this.lastPostResponse.status() >= 200 &&
      this.lastPostResponse.status() < 300,
    `登録APIがHTTP ${this.lastPostResponse.status()}を返しました`,
  )
  const tasks = await fetchTaskList(this.page)
  assert.ok(
    tasks.some((task) => task.taskName === this.currentTaskName),
    `登録済みタスク「${this.currentTaskName}」がAPI一覧にありません`,
  )
  const savedTask = tasks.find((task) => task.taskName === this.currentTaskName)
  assert.equal(savedTask.dueDate, this.expectedDueDate)
})

Then('登録完了メッセージが表示される', async function () {
  assert.equal(await this.page.getByRole('status').isVisible(), true)
})

Then('登録が拒否される', async function () {
  assert.equal(await this.page.getByRole('alert').isVisible(), true)
  assert.ok(this.lastPostResponse, 'タスク登録リクエストが送信されていません')
  assert.ok(
    this.lastPostResponse.status() >= 400 &&
      this.lastPostResponse.status() < 500,
    `入力エラーではHTTP ${this.lastPostResponse.status()}が返りました`,
  )
})

Then('入力エラーメッセージが表示される', async function () {
  const alert = this.page.getByRole('alert')
  assert.equal(await alert.isVisible(), true)
  assert.ok((await alert.innerText()).trim().length > 0)
})

Then('タスク一覧に新しいタスクが追加されない', async function () {
  await this.page.getByRole('button', { name: '一覧に戻る' }).click()
  assert.equal(
    await this.page.getByText(this.currentTaskName, { exact: true }).count(),
    0,
  )
})

Then('タスク一覧に「ログイン画面を作成」が表示される', async function () {
  const backButton = this.page.getByRole('button', { name: '一覧に戻る' })
  if (await backButton.isVisible().catch(() => false)) {
    await backButton.click()
  }
  const task = this.page
    .getByRole('listitem')
    .filter({ hasText: 'ログイン画面を作成' })
  assert.equal(await task.isVisible(), true)
})

Then(/^(\d+)文字のタスク情報は保存されない$/, async function () {
  assert.equal(await this.page.getByRole('alert').isVisible(), true)
  assert.ok(
    this.persistedTasksBeforeRegistration,
    '登録前のタスク一覧が記録されていません',
  )
  const tasks = await fetchPersistedTasks(this)
  assert.deepEqual(tasks, this.persistedTasksBeforeRegistration)
})

Then('タスク情報は保存されない', async function () {
  assert.equal(await this.page.getByRole('alert').isVisible(), true)
  assert.ok(
    this.persistedTasksBeforeRegistration,
    '登録前のタスク一覧が記録されていません',
  )
  const tasks = await fetchPersistedTasks(this)
  assert.deepEqual(tasks, this.persistedTasksBeforeRegistration)
})

Then(
  'APIから登録済みタスク情報を再取得しても入力したタスク情報は存在しない',
  async function () {
    const tasks = await fetchPersistedTasks(this)
    assert.ok(
      this.persistedTasksBeforeRegistration,
      '登録前のタスク一覧が記録されていません',
    )
    assert.deepEqual(tasks, this.persistedTasksBeforeRegistration)
  },
)

Then(/^担当者「(.+)」がタスク情報に保存される$/, async function (assignee) {
  assert.ok(this.lastPostResponse)
  assert.ok(
    this.lastPostResponse.status() >= 200 &&
      this.lastPostResponse.status() < 300,
  )
  assert.equal(
    this.lastPostResponse.request().postDataJSON().assigneeName,
    assignee,
  )
  const tasks = await fetchTaskList(this.page)
  assert.ok(
    tasks.some(
      (task) =>
        task.taskName === this.currentTaskName &&
        task.assigneeName === assignee,
    ),
    `担当者「${assignee}」の登録結果がAPI一覧にありません`,
  )
  this.expectedAssignee = assignee
})

Then(/^登録後に担当者「(.+)」を確認できる$/, async function (assignee) {
  const task = this.page
    .getByRole('listitem')
    .filter({ hasText: this.currentTaskName })
  await task.getByRole('button', { name: /編集/ }).click()
  assert.equal(
    await this.page
      .getByText(`担当者: ${assignee}`, { exact: true })
      .isVisible(),
    true,
  )
})

Then('タスクが登録される', async function () {
  assert.ok(this.lastPostResponse, 'タスク登録リクエストが送信されていません')
  assert.ok(
    this.lastPostResponse.status() >= 200 &&
      this.lastPostResponse.status() < 300,
    `登録APIがHTTP ${this.lastPostResponse.status()}を返しました`,
  )
  const tasks = await fetchTaskList(this.page)
  assert.ok(
    tasks.some((task) => task.taskName === this.currentTaskName),
    `登録済みタスク「${this.currentTaskName}」がAPI一覧にありません`,
  )
  const savedTask = tasks.find((task) => task.taskName === this.currentTaskName)
  assert.equal(savedTask.dueDate, this.expectedDueDate)
  if (this.expectedAssignee !== undefined) {
    assert.equal(savedTask.assigneeName, this.expectedAssignee)
    if (this.expectedAssignee === null) {
      const taskRow = this.page
        .getByRole('listitem')
        .filter({ hasText: this.currentTaskName })
      await taskRow.getByRole('button', { name: /編集/ }).click()
      assert.equal(
        await this.page
          .getByText('担当者: 未割当', { exact: true })
          .isVisible(),
        true,
      )
    }
  }
})
