import assert from 'node:assert/strict'
import { Given, Then } from '@cucumber/cucumber'
import { taskRow } from '../support/task-page.js'

Given('タスク管理システムを利用できる', async function () {
  await this.page.goto(this.baseUrl)
})

Given(/^タスク「(.+)」が登録されている$/, async function (name) {
  const task = {
    taskId: this.fixtureTasks.length + 1,
    taskName: name,
    description: '既存タスクの説明',
    assigneeName: '',
    dueDate: '2026-12-01',
  }
  this.fixtureTasks.push(task)
  this.originalTask ??= { ...task }
  this.originalTaskSnapshot ??= { ...task }
  await this.page.reload()
})

Given(
  /^タスク「(.+)」が登録され、担当者は「(.+)」である$/,
  async function (name, assigneeName) {
    const task = {
      taskId: this.fixtureTasks.length + 1,
      taskName: name,
      description: '既存タスクの説明',
      assigneeName,
      dueDate: '2026-12-01',
    }
    this.fixtureTasks.push(task)
    this.originalTask ??= { ...task }
    this.originalTaskSnapshot ??= { ...task }
    await this.page.reload()
  },
)

Given(
  /^タスク「(.+)」が担当者「(.+)」で登録されている$/,
  async function (name, assigneeName) {
    const task = {
      taskId: this.fixtureTasks.length + 1,
      taskName: name,
      description: '既存タスクの説明',
      assigneeName,
      dueDate: '2026-12-01',
    }
    this.fixtureTasks.push(task)
    this.originalTask ??= { ...task }
    this.originalTaskSnapshot ??= { ...task }
    await this.page.reload()
  },
)

Given(
  /^タスク「(.+)」が登録され、担当者は (.+) である$/,
  async function (name, assigneeName) {
    const task = {
      taskId: this.fixtureTasks.length + 1,
      taskName: name,
      description: '既存タスクの説明',
      assigneeName: assigneeName === '未設定' ? '' : assigneeName,
      dueDate: '2026-12-01',
    }
    this.fixtureTasks.push(task)
    this.originalTask ??= { ...task }
    this.originalTaskSnapshot ??= { ...task }
    await this.page.reload()
  },
)

Given(
  /^タスク「(.+)」が担当者「(.+)」で登録され、その現在の情報を記録しておく$/,
  async function (name, assigneeName) {
    const task = {
      taskId: this.fixtureTasks.length + 1,
      taskName: name,
      description: '既存タスクの説明',
      assigneeName,
      dueDate: '2026-12-01',
    }
    this.fixtureTasks.push(task)
    this.originalTask ??= { ...task }
    this.originalTaskSnapshot = { ...task }
    await this.page.reload()
  },
)

Given(
  /^操作前のタスク「(.+)」のタスク名、説明、担当者、期限日を記録しておく$/,
  function (name) {
    const task = this.fixtureTasks.find((item) => item.taskName === name)
    assert.ok(task, `操作前にタスク「${name}」が登録されていません`)
    this.taskSnapshots ??= new Map()
    this.taskSnapshots.set(name, { ...task })
  },
)

Then(
  /^タスク「(.+)」のタスク名、説明、担当者、期限日は操作前と変わらない$/,
  async function (name) {
    const expected = this.taskSnapshots?.get(name)
    assert.ok(expected, `タスク「${name}」の操作前情報が記録されていません`)
    const actual = this.fixtureTasks.find((item) => item.taskName === name)
    assert.ok(actual, `タスク「${name}」が一覧から失われています`)
    assert.deepEqual(
      {
        taskName: actual.taskName,
        description: actual.description,
        assigneeName: actual.assigneeName,
        dueDate: actual.dueDate,
      },
      {
        taskName: expected.taskName,
        description: expected.description,
        assigneeName: expected.assigneeName,
        dueDate: expected.dueDate,
      },
    )
  },
)

Then('他のタスク情報は変更されない', async function () {
  const [name, expected] = this.taskSnapshots?.entries().next().value ?? []
  assert.ok(expected, '操作前の他タスク情報が記録されていません')
  const actual = await this.page.evaluate(async (taskName) => {
    const response = await fetch('/api/tasks')
    const { items } = await response.json()
    return items.find((item) => item.taskName === taskName)
  }, name)
  assert.ok(actual, '他タスクが一覧から失われています')
  assert.deepEqual(
    {
      taskName: actual.taskName,
      description: actual.description,
      assigneeName: actual.assigneeName,
      dueDate: actual.dueDate,
    },
    {
      taskName: expected.taskName,
      description: expected.description,
      assigneeName: expected.assigneeName,
      dueDate: expected.dueDate,
    },
  )
})

Then(
  /^タスク一覧に「(?!ログイン画面を作成)(.+)」が表示される$/,
  async function (name) {
    const backButton = this.page.getByRole('button', { name: '一覧に戻る' })
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click()
    }
    assert.equal(await taskRow(this.page, name).isVisible(), true)
  },
)
