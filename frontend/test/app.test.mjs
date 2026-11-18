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
  } finally {
    await vite.close()
  }
})
