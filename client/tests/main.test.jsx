import { describe, it, expect, vi, beforeAll } from 'vitest'
import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from '../src/context/AuthContext.jsx'
import App from '../src/App.jsx'

//createRoot is faked so importing main.jsx records what it renders instead of mounting it

const { createRoot, render } = vi.hoisted(() => {
  const render = vi.fn()
  return { render, createRoot: vi.fn(() => ({ render })) }
})
vi.mock('react-dom/client', () => ({ createRoot }))
vi.mock('../src/App.jsx', () => ({ default: () => null }))

//Recorded once here, because restoreMocks clears mock call history before each test
let rootElement, createRootArgs, renderCalls

beforeAll(async () => {
  document.body.innerHTML = '<div id="root"></div>'
  rootElement = document.getElementById('root')
  await import('../src/main.jsx')
  createRootArgs = createRoot.mock.calls.map((args) => args[0])
  renderCalls = render.mock.calls.map((args) => args[0])
})

//Follows single-child wrappers from the outside in and returns their component types
function wrapperChain(element) {
  const chain = []
  let node = element
  while (node && typeof node === 'object' && 'type' in node) {
    chain.push(node.type)
    node = node.props.children
  }
  return chain
}

describe('main.jsx', () => {
  it('mounts into #root', () => {
    expect(createRootArgs).toEqual([rootElement])
  })

  it('renders once', () => {
    expect(renderCalls).toHaveLength(1)
  })

  it('nests StrictMode > BrowserRouter > AuthProvider > App', () => {
    //AuthProvider sits inside the router so it can use router hooks like useNavigate
    expect(wrapperChain(renderCalls[0])).toEqual([StrictMode, BrowserRouter, AuthProvider, App])
  })
})
