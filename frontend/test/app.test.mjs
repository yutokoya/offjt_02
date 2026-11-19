import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('the task list and registration form render as separate screens', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
    const listMarkup = renderToStaticMarkup(createElement(App))
    assert.match(listMarkup, /<h2 id="list-heading">タスク一覧<\/h2>/)
    assert.match(listMarkup, /タスク登録/)
    assert.doesNotMatch(listMarkup, /<form/)

    const { TaskRegistrationPage } = await vite.ssrLoadModule(
      '/src/features/tasks/TaskRegistrationPage.tsx',
    )
    const registrationMarkup = renderToStaticMarkup(
      createElement(TaskRegistrationPage, {
        onBack: () => {},
        onRegistered: () => {},
      }),
    )
    assert.match(registrationMarkup, /<form/)
    assert.match(registrationMarkup, /一覧に戻る/)
    assert.doesNotMatch(registrationMarkup, /list-heading/)

    const { TaskUpdatePage } = await vite.ssrLoadModule(
      '/src/features/tasks/TaskUpdatePage.tsx',
    )
    const updateMarkup = renderToStaticMarkup(
      createElement(TaskUpdatePage, { taskId: 1, onBack: () => {} }),
    )
    assert.match(updateMarkup, /<h2 id="update-heading">タスク更新<\/h2>/)
    assert.match(updateMarkup, /更新/)
    assert.doesNotMatch(updateMarkup, /担当者/)
  } finally {
    await vite.close()
  }
})

test('registration success shows a status and API failure shows an alert', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  const originalFetch = globalThis.fetch

  try {
    const { submitTaskRegistration } = await vite.ssrLoadModule(
      '/src/features/tasks/registrationFeedback.ts',
    )
    const { TaskRegistrationFeedback } = await vite.ssrLoadModule(
      '/src/features/tasks/TaskRegistrationPage.tsx',
    )
    const task = {
      taskName: 'Test task',
      description: '',
      assigneeName: '',
      dueDate: '2026-12-01',
    }
    const registeredTask = { ...task, taskId: 42 }

    globalThis.fetch = async () =>
      new Response(JSON.stringify(registeredTask), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    const successSubmission = await submitTaskRegistration(task)
    const successMarkup = renderToStaticMarkup(
      createElement(TaskRegistrationFeedback, successSubmission.feedback),
    )
    assert.deepEqual(successSubmission.task, registeredTask)
    assert.match(successMarkup, /<p role="status">タスクを登録しました。<\/p>/)
    assert.doesNotMatch(successMarkup, /role="alert"/)

    globalThis.fetch = async () =>
      new Response('タスク登録の業務処理はこれから実装します。', {
        status: 501,
      })
    const failureSubmission = await submitTaskRegistration(task)
    const failureMarkup = renderToStaticMarkup(
      createElement(TaskRegistrationFeedback, failureSubmission.feedback),
    )
    assert.equal(failureSubmission.task, null)
    assert.match(failureMarkup, /<p role="alert">/)
    assert.match(failureMarkup, /タスク登録の業務処理はこれから実装します。/)
    assert.doesNotMatch(failureMarkup, /role="status"/)
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})

test('a registered task appears in the list after it is fetched again', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  const originalFetch = globalThis.fetch
  const registeredTask = {
    taskId: 42,
    taskName: 'Persisted task',
    description: 'Saved description',
    assigneeName: 'Participant',
    dueDate: '2026-12-01',
  }
  let savedTasks = []

  try {
    const { fetchTasks, registerTask } = await vite.ssrLoadModule(
      '/src/features/tasks/taskApi.ts',
    )
    const { appendRegisteredTask } = await vite.ssrLoadModule(
      '/src/features/tasks/taskListState.ts',
    )
    globalThis.fetch = async (_url, init) => {
      if (init?.method === 'POST') {
        savedTasks = [registeredTask]
        return new Response(JSON.stringify(registeredTask), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ items: savedTasks }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const createdTask = await registerTask({
      taskName: registeredTask.taskName,
      description: registeredTask.description,
      assigneeName: registeredTask.assigneeName,
      dueDate: registeredTask.dueDate,
    })
    const listedTasks = await fetchTasks()
    const existingTask = {
      ...registeredTask,
      taskId: 41,
      taskName: 'Existing task',
    }

    assert.deepEqual(listedTasks, [registeredTask])
    assert.deepEqual(appendRegisteredTask([existingTask], createdTask), [
      existingTask,
      registeredTask,
    ])
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})
