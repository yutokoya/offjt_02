import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

// 一覧・登録・更新が別画面として描画され、更新画面では取得中表示が出ることを確認する。
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
    assert.match(updateMarkup, /タスクを取得しています。/)
  } finally {
    await vite.close()
  }
})

// 取得したタスク名・説明・担当者・期限日が初期値になり、担当者nullは「未割当」と表示することを確認する。
test('the update form displays the task values returned by the API', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })

  try {
    const { TaskUpdateForm } = await vite.ssrLoadModule(
      '/src/features/tasks/TaskUpdatePage.tsx',
    )
    const formMarkup = renderToStaticMarkup(
      createElement(TaskUpdateForm, {
        task: {
          taskName: 'Existing task',
          description: 'Current description',
          assigneeName: 'Participant',
          dueDate: '2026-11-19',
        },
        onChange: () => {},
        onSubmit: () => {},
      }),
    )
    assert.match(formMarkup, /value="Existing task"/)
    assert.match(formMarkup, /Current description/)
    assert.match(formMarkup, /担当者: Participant/)
    assert.match(formMarkup, /value="2026-11-19"/)

    const unassignedMarkup = renderToStaticMarkup(
      createElement(TaskUpdateForm, {
        task: {
          taskName: 'Task without assignee',
          description: '',
          assigneeName: null,
          dueDate: '2026-11-20',
        },
        onChange: () => {},
        onSubmit: () => {},
      }),
    )
    assert.match(unassignedMarkup, /担当者: 未割当/)
  } finally {
    await vite.close()
  }
})

// 指定IDでGETし、200の現在値を返すことと、404時に取得エラーとなることを確認する。
test('fetchTask retrieves the selected task and reports a missing task', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  const originalFetch = globalThis.fetch

  try {
    const { fetchTask } = await vite.ssrLoadModule(
      '/src/features/tasks/taskApi.ts',
    )
    const task = {
      taskId: 42,
      taskName: 'Existing task',
      description: 'Current description',
      assigneeName: 'Participant',
      dueDate: '2026-11-19',
    }
    let requestedUrl
    globalThis.fetch = async (url) => {
      requestedUrl = url
      return new Response(JSON.stringify(task), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    assert.deepEqual(await fetchTask(42), task)
    assert.equal(requestedUrl, '/api/tasks/42')

    globalThis.fetch = async () => new Response('', { status: 404 })
    await assert.rejects(fetchTask(404), /タスクを取得できませんでした。/)
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})

// 更新APIの200応答で完了メッセージ、失敗応答でエラーのみとなり、成功表示が出ないことを確認する。
test('task update feedback reports success only when the update API succeeds', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  const originalFetch = globalThis.fetch

  try {
    const { submitTaskUpdate } = await vite.ssrLoadModule(
      '/src/features/tasks/updateFeedback.ts',
    )
    const { TaskUpdateFeedback } = await vite.ssrLoadModule(
      '/src/features/tasks/TaskUpdatePage.tsx',
    )
    const task = {
      taskName: 'Updated task',
      description: 'Updated description',
      assigneeName: 'Participant',
      dueDate: '2026-12-01',
    }

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ ...task, taskId: 42 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    const successFeedback = await submitTaskUpdate(42, task)
    const successMarkup = renderToStaticMarkup(
      createElement(TaskUpdateFeedback, successFeedback),
    )
    assert.deepEqual(successFeedback, {
      message: 'タスクを更新しました。',
      error: '',
    })
    assert.match(successMarkup, /<p role="status">タスクを更新しました。<\/p>/)
    assert.doesNotMatch(successMarkup, /role="alert"/)

    globalThis.fetch = async () =>
      new Response('更新に失敗しました。', { status: 500 })
    const failureFeedback = await submitTaskUpdate(42, task)
    const failureMarkup = renderToStaticMarkup(
      createElement(TaskUpdateFeedback, failureFeedback),
    )
    assert.deepEqual(failureFeedback, {
      message: '',
      error: '更新に失敗しました。',
    })
    assert.match(failureMarkup, /<p role="alert">更新に失敗しました。<\/p>/)
    assert.doesNotMatch(failureMarkup, /role="status"/)
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})

// 登録成功では完了メッセージを表示し、API失敗・必須項目エラーでは成功扱いにしないことを確認する。
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

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: '入力内容を確認してください。',
          fieldErrors: {
            taskName: 'タスク名は必須です。',
            description: '説明は200文字以内で入力してください。',
            dueDate: '期限日は必須です。',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    const validationSubmission = await submitTaskRegistration(task)
    const validationMarkup = renderToStaticMarkup(
      createElement(TaskRegistrationFeedback, validationSubmission.feedback),
    )
    assert.equal(validationSubmission.task, null)
    assert.equal(validationSubmission.feedback.message, '')
    assert.match(validationMarkup, /id="taskName-error">タスク名は必須です。/)
    assert.match(
      validationMarkup,
      /id="description-error">説明は200文字以内で入力してください。/,
    )
    assert.match(validationMarkup, /id="dueDate-error">期限日は必須です。/)
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})

// 前後空白除去後の名前をUnicodeコードポイント数で判定し、100文字は受け付け101文字は送信前に拒否することを確認する。
test('registration validates task name length by trimmed Unicode code points', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  const originalFetch = globalThis.fetch
  let requestCount = 0

  try {
    const { submitTaskRegistration } = await vite.ssrLoadModule(
      '/src/features/tasks/registrationFeedback.ts',
    )
    globalThis.fetch = async () => {
      requestCount += 1
      return new Response(
        JSON.stringify({
          taskId: 42,
          taskName: 'a'.repeat(98) + '😀😀',
          description: '',
          assigneeName: null,
          dueDate: '2026-11-19',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // 😀はUTF-16では2単位だがコードポイントでは1文字。全角空白を除くと98 + 2で100文字になる。
    const validSubmission = await submitTaskRegistration({
      taskName: `\u3000${'a'.repeat(98)}😀😀\u3000`,
      description: '',
      assigneeName: '',
      dueDate: '2026-11-19',
    })
    assert.equal(validSubmission.task?.taskName, 'a'.repeat(98) + '😀😀')
    assert.equal(requestCount, 1)

    // 99 + 2で101コードポイントとなるため、APIを呼び出す前に拒否される。
    const invalidSubmission = await submitTaskRegistration({
      taskName: 'a'.repeat(99) + '😀😀',
      description: '',
      assigneeName: '',
      dueDate: '2026-11-19',
    })
    assert.equal(invalidSubmission.task, null)
    assert.equal(
      invalidSubmission.feedback.fieldErrors.taskName,
      'タスク名は100文字以内で入力してください。',
    )
    assert.equal(requestCount, 1)
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})

// 説明は前後空白を除去せず、200コードポイントは登録し201コードポイントは送信前に拒否することを確認する。
test('registration validates description length by Unicode code points', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  const originalFetch = globalThis.fetch
  let requestCount = 0
  let submittedDescription

  try {
    const { submitTaskRegistration } = await vite.ssrLoadModule(
      '/src/features/tasks/registrationFeedback.ts',
    )
    globalThis.fetch = async (_url, init) => {
      requestCount += 1
      submittedDescription = JSON.parse(init.body).description
      return new Response(
        JSON.stringify({
          taskId: 42,
          taskName: 'Description boundary',
          description: submittedDescription,
          assigneeName: null,
          dueDate: '2026-11-19',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const validDescription = ` ${'a'.repeat(197)}😀😀`
    const validSubmission = await submitTaskRegistration({
      taskName: 'Description boundary',
      description: validDescription,
      assigneeName: '',
      dueDate: '2026-11-19',
    })
    assert.equal(validSubmission.task?.description, validDescription)
    assert.equal(submittedDescription, validDescription)
    assert.equal(requestCount, 1)

    const invalidSubmission = await submitTaskRegistration({
      taskName: 'Description over limit',
      description: 'a'.repeat(199) + '😀😀',
      assigneeName: '',
      dueDate: '2026-11-19',
    })
    assert.equal(invalidSubmission.task, null)
    assert.equal(
      invalidSubmission.feedback.fieldErrors.description,
      '説明は200文字以内で入力してください。',
    )
    assert.equal(requestCount, 1)
  } finally {
    globalThis.fetch = originalFetch
    await vite.close()
  }
})

// 登録APIの応答と一覧再取得の両方に、新しいタスクが反映されることを確認する。
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

test('task deletion confirmation identifies the task and supports confirmation or cancellation', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })

  try {
    const { confirmTaskDeletion } = await vite.ssrLoadModule(
      '/src/features/tasks/taskDeletion.ts',
    )
    const task = {
      taskId: 42,
      taskName: '不要なタスク',
      description: '',
      assigneeName: '',
      dueDate: '2026-12-01',
    }
    const messages = []

    const confirmed = confirmTaskDeletion(task, (message) => {
      messages.push(message)
      return true
    })
    const cancelled = confirmTaskDeletion(task, (message) => {
      messages.push(message)
      return false
    })

    assert.equal(confirmed, true)
    assert.equal(cancelled, false)
    assert.deepEqual(messages, [
      'タスク「不要なタスク」を削除しますか？',
      'タスク「不要なタスク」を削除しますか？',
    ])
  } finally {
    await vite.close()
  }
})
