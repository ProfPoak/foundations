// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { CUSTOMER_STATUSES, TASK_STATUSES, INTERACTIONS } from '../src/constants.js'

//Day 1, Step 2: constants.js
//Reads the tuples straight from models.py so these tests also catch the two drifting apart later
const models = readFileSync(new URL('../../server/models.py', import.meta.url), 'utf-8')

function backendTuple(className, attr) {
  const classBody = models.split(`class ${className}(`)[1].split('\nclass ')[0]
  const tuple = classBody.match(new RegExp(`${attr} = \\(([^)]*)\\)`))[1]
  return [...tuple.matchAll(/"([^"]+)"/g)].map((m) => m[1])
}

describe('constants.js matches server/models.py', () => {
  it('CUSTOMER_STATUSES matches Customer.STATUSES', () => {
    expect(CUSTOMER_STATUSES).toEqual(backendTuple('Customer', 'STATUSES'))
  })

  it('TASK_STATUSES matches Task.STATUSES', () => {
    expect(TASK_STATUSES).toEqual(backendTuple('Task', 'STATUSES'))
  })

  it('INTERACTIONS matches Event.INTERACTIONS', () => {
    expect(INTERACTIONS).toEqual(backendTuple('Event', 'INTERACTIONS'))
  })

  //Guards the parser itself, so an empty backend match can't make the tests above pass vacuously
  it('reads non-empty tuples from the backend', () => {
    expect(backendTuple('Customer', 'STATUSES')).toContain('potential')
    expect(backendTuple('Task', 'STATUSES')).toContain('in_progress')
    expect(backendTuple('Event', 'INTERACTIONS')).toContain('follow-up')
  })
})
