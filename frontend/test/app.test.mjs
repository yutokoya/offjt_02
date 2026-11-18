import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('the frontend can render its initial screen', async () => {
  const vite = await createServer({
    server: { middlewareMode: true, ws: false },
  })
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
    const markup = renderToStaticMarkup(createElement(App))
    assert.match(markup, /<h1>Get started<\/h1>/)
  } finally {
    await vite.close()
  }
})
