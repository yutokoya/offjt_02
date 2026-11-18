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
      createElement(TaskRegistrationPage, { onBack: () => {} }),
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
