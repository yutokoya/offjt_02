import assert from 'node:assert/strict'
import { Given, Then, When } from '@cucumber/cucumber'
import {
  descriptionInput,
  dueDateInput,
  fetchTaskList,
  openTaskEditor,
  taskNameInput,
} from '../support/task-page.js'

async function mockNextTaskUpdate(
  world,
  { notFound = false, invalidDueDate } = {},
) {
  await world.page.route('**/api/tasks/*', async (route) => {
    if (route.request().method() !== 'PUT') {
      await route.fallback()
      return
    }

    const taskId = Number(
      new URL(route.request().url()).pathname.split('/').at(-1),
    )
    const task = world.fixtureTasks.find((item) => item.taskId === taskId)
    if (notFound) {
      const missingTaskUrl = new URL(route.request().url())
      const tasksPath = missingTaskUrl.pathname.slice(
        0,
        missingTaskUrl.pathname.lastIndexOf('/') + 1,
      )
      missingTaskUrl.pathname = `${tasksPath}${Number.MAX_SAFE_INTEGER}`
      await route.fallback({ url: missingTaskUrl.toString() })
      return
    }
    if (!task) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'タスクが見つかりません。' }),
      })
      return
    }

    const requestBody = route.request().postDataJSON()
    if (invalidDueDate !== undefined) {
      requestBody.dueDate = invalidDueDate
    }
    const nameLength = [...(requestBody.taskName ?? '').trim()].length
    const descriptionLength = [...(requestBody.description ?? '')].length
    const dueDate = requestBody.dueDate ?? ''
    const dateIsValid =
      /^\d{4}-\d{2}-\d{2}$/.test(dueDate) &&
      new Date(`${dueDate}T00:00:00.000Z`).toISOString().slice(0, 10) ===
        dueDate
    if (
      nameLength === 0 ||
      nameLength > 100 ||
      descriptionLength > 200 ||
      !dateIsValid
    ) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ message: '入力内容を確認してください。' }),
      })
      return
    }

    Object.assign(task, requestBody)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(task),
    })
  })
}

async function submitUpdate(world) {
  const response = world.page.waitForResponse(
    (item) =>
      item.request().method() === 'PUT' &&
      new URL(item.url()).pathname.startsWith('/api/tasks/'),
  )
  await world.page.getByRole('button', { name: '更新', exact: true }).click()
  world.lastMutationResponse = await response
}

// 受け入れ条件: M2-05, M2-06, M2-07, M2-08
Given('対象タスクの現在の情報を記録しておく', function () {
  assert.ok(this.originalTask)
  this.originalTaskSnapshot = { ...this.originalTask }
})

// 受け入れ条件: M2-01
When(/^タスク一覧から「(.+)」の編集を選択する$/, async function (name) {
  await openTaskEditor(this.page, name)
})

// 受け入れ条件: M2-01
Then(
  '対象タスクの現在のタスク名、説明、担当者、期限日が表示される',
  async function () {
    assert.equal(
      await taskNameInput(this.page).inputValue(),
      this.originalTask.taskName,
    )
    assert.equal(
      await descriptionInput(this.page).inputValue(),
      this.originalTask.description,
    )
    assert.equal(
      await this.page
        .getByText(`担当者: ${this.originalTask.assigneeName || '未割当'}`, {
          exact: true,
        })
        .isVisible(),
      true,
    )
    assert.equal(
      await dueDateInput(this.page).inputValue(),
      this.originalTask.dueDate,
    )
  },
)

// 受け入れ条件: M2-02
When(/^タスク名を「(.+)」に変更して更新する$/, async function (name) {
  await openTaskEditor(this.page, this.originalTask.taskName)
  this.updatedTaskName = name
  await taskNameInput(this.page).fill(name)
  await mockNextTaskUpdate(this)
  await submitUpdate(this)
})

// 受け入れ条件: M2-02
Then('タスク情報が更新される', async function () {
  assert.equal(await this.page.getByRole('status').isVisible(), true)
  assert.ok(
    this.lastMutationResponse,
    'タスク更新リクエストが送信されていません',
  )
  assert.ok(
    this.lastMutationResponse.status() >= 200 &&
      this.lastMutationResponse.status() < 300,
    `更新APIがHTTP ${this.lastMutationResponse.status()}を返しました`,
  )
  const task = (await fetchTaskList(this.page)).find(
    (item) => item.taskId === this.originalTask.taskId,
  )
  assert.ok(task, '更新対象のタスクが一覧から失われています')
  assert.deepEqual(
    {
      taskName: task.taskName,
      description: task.description,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
    },
    {
      taskName: this.updatedTaskName,
      description: this.originalTask.description,
      assigneeName: this.originalTask.assigneeName,
      dueDate: this.originalTask.dueDate,
    },
  )
})

// 受け入れ条件: M2-03
Then('更新完了メッセージが表示される', async function () {
  assert.equal(await this.page.getByRole('status').isVisible(), true)
})

// 受け入れ条件: M2-04
Then(/^タスク一覧に最新のタスク名「(.+)」が表示される$/, async function (name) {
  await this.page.getByRole('button', { name: '一覧に戻る' }).click()
  assert.equal(
    await this.page.getByText(name, { exact: true }).isVisible(),
    true,
  )
})

// 受け入れ条件: M2-05
When(/^(.+) に (.+) を指定して更新する$/, async function (field, inputValue) {
  await openTaskEditor(this.page, this.originalTask.taskName)
  const value = inputValue === '未入力' ? '' : '   '
  if (field === 'タスク名') {
    await taskNameInput(this.page).fill(value)
  } else {
    await dueDateInput(this.page).fill('')
  }
  await mockNextTaskUpdate(this)
  await submitUpdate(this)
})

// 受け入れ条件: M2-06
When(
  /^タスク名を前後空白除去後(\d+) Unicodeコードポイントにして更新する$/,
  async function (length) {
    await openTaskEditor(this.page, this.originalTask.taskName)
    await taskNameInput(this.page).fill(`  ${'😀'.repeat(Number(length))}  `)
    await mockNextTaskUpdate(this)
    await submitUpdate(this)
  },
)

// 受け入れ条件: M2-07
When(
  /^説明を(\d+) Unicodeコードポイントにして更新する$/,
  async function (length) {
    await openTaskEditor(this.page, this.originalTask.taskName)
    await descriptionInput(this.page).fill('😀'.repeat(Number(length)))
    await mockNextTaskUpdate(this)
    await submitUpdate(this)
  },
)

// 受け入れ条件: M2-08
When(/^期限日に「(.+)」を指定して更新する$/, async function (date) {
  await openTaskEditor(this.page, this.originalTask.taskName)
  await dueDateInput(this.page).fill(date)
  await mockNextTaskUpdate(this, { invalidDueDate: date })
  await submitUpdate(this)
})

// 受け入れ条件: M2-05, M2-06, M2-07, M2-08
Then('更新が拒否される', async function () {
  assert.equal(await this.page.getByRole('alert').isVisible(), true)
  assert.ok(this.lastMutationResponse, '更新リクエストが送信されていません')
  assert.equal(
    this.lastMutationResponse.status(),
    400,
    `入力エラーではHTTP ${this.lastMutationResponse.status()}が返りました`,
  )
})

// 受け入れ条件: M2-05, M2-06, M2-07, M2-08
Then('対象タスクの情報は更新前のまま保持される', async function () {
  assert.ok(this.originalTaskSnapshot)
  const actual = await this.page.evaluate(async (taskId) => {
    const response = await fetch('/api/tasks')
    const { items } = await response.json()
    return items.find((item) => item.taskId === taskId)
  }, this.originalTaskSnapshot.taskId)
  assert.ok(actual, '更新対象のタスクが一覧から失われています')
  assert.deepEqual(actual, this.originalTaskSnapshot)
})

// 受け入れ条件: M2-09
When('存在しないタスクを指定して更新する', async function () {
  await openTaskEditor(this.page, this.originalTask.taskName)
  await taskNameInput(this.page).fill(this.originalTask.taskName)
  await mockNextTaskUpdate(this, { notFound: true })
  await submitUpdate(this)
})

// 受け入れ条件: M2-09
Then('更新が拒否され、エラーメッセージが表示される', async function () {
  assert.ok(this.lastMutationResponse, '更新リクエストが送信されていません')
  assert.equal(
    this.lastMutationResponse.status(),
    404,
    `存在しないタスクの更新ではHTTP ${this.lastMutationResponse.status()}が返りました`,
  )
  assert.equal(await this.page.getByRole('alert').isVisible(), true)
})

// 受け入れ条件: M2-10
When(/^担当者を (.+) にして更新する$/, async function (assignee) {
  const taskId = this.originalTask.taskId
  const nextAssignee = assignee === '未設定' ? null : assignee
  const task = this.fixtureTasks.find((item) => item.taskId === taskId)
  assert.ok(task, `更新対象タスク ${taskId} がfixtureにありません`)
  await mockNextTaskUpdate(this)
  const mutationResponse = this.page.waitForResponse(
    (item) =>
      item.request().method() === 'PUT' &&
      new URL(item.url()).pathname === `/api/tasks/${taskId}`,
  )
  const response = await this.page.evaluate(
    async ({ taskId: id, currentTask, assigneeName }) => {
      const result = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentTask, assigneeName }),
      })
      return { status: result.status, body: await result.json() }
    },
    { taskId, currentTask: task, assigneeName: nextAssignee },
  )
  assert.equal(response.status, 200)
  assert.equal(response.body.assigneeName, nextAssignee)
  this.lastMutationResponse = await mutationResponse
})

// 受け入れ条件: M2-10
Then(
  /^更新後の担当者情報が (.+) として保存・表示される$/,
  async function (assignee) {
    assert.ok(
      this.lastMutationResponse,
      'タスク更新リクエストが送信されていません',
    )
    assert.ok(
      this.lastMutationResponse.status() >= 200 &&
        this.lastMutationResponse.status() < 300,
      `担当者更新APIがHTTP ${this.lastMutationResponse.status()}を返しました`,
    )
    assert.equal(
      this.lastMutationResponse.request().postDataJSON().assigneeName,
      assignee === '未設定' ? null : assignee,
    )
    const task = this.fixtureTasks.find(
      (item) => item.taskId === this.originalTask.taskId,
    )
    assert.ok(task)
    assert.equal(task.assigneeName, assignee === '未設定' ? null : assignee)
    await openTaskEditor(this.page, this.originalTask.taskName)
    assert.equal(
      await this.page
        .getByText(`担当者: ${assignee === '未設定' ? '未割当' : assignee}`, {
          exact: true,
        })
        .isVisible(),
      true,
    )
  },
)
