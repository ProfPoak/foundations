// @vitest-environment node
import { describe, it, expect } from 'vitest'
import config from '../vite.config.js'

//Day 1, Step 1: Vite proxy
describe('vite.config.js proxy', () => {
  const proxy = config.server?.proxy?.['/api']

  it('defines a proxy for /api', () => {
    expect(proxy).toBeDefined()
  })

  it('forwards to Flask on port 5555', () => {
    expect(proxy.target).toBe('http://localhost:5555')
  })

  it('sets changeOrigin', () => {
    expect(proxy.changeOrigin).toBe(true)
  })

  it('does not proxy frontend page URLs', () => {
    //A bare /customers proxy would hijack the React page at /customers/:id
    expect(Object.keys(config.server.proxy)).toEqual(['/api'])
  })

  describe('rewrite', () => {
    it('strips the /api prefix', () => {
      expect(proxy.rewrite('/api/login')).toBe('/login')
    })

    it('keeps nested paths and query strings intact', () => {
      expect(proxy.rewrite('/api/customers/3/notes')).toBe('/customers/3/notes')
      expect(proxy.rewrite('/api/customers?status=client')).toBe('/customers?status=client')
    })

    it('only strips /api from the start of the path', () => {
      expect(proxy.rewrite('/api/notes/api')).toBe('/notes/api')
    })
  })
})
