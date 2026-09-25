import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorMessage from '../src/components/shared/ErrorMessage.jsx'

//Day 1, Step 12: ErrorMessage
//Messages are found by their exact text, so each one has to be its own element (e.g. an <li>)

describe('ErrorMessage renders nothing', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('when errors is %s', (_label, errors) => {
    const { container } = render(<ErrorMessage errors={errors} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('when the errors prop is left off', () => {
    const { container } = render(<ErrorMessage />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ErrorMessage shapes', () => {
  it('{error: "msg"} shows the message', () => {
    render(<ErrorMessage errors={{ error: 'Login failed. Please check Username and Password' }} />)
    expect(screen.getByText('Login failed. Please check Username and Password')).toBeInTheDocument()
  })

  it('{errors: [...]} shows each string separately', () => {
    render(<ErrorMessage errors={{ errors: ['Username already taken', 'Password must be at least 8 characters'] }} />)
    expect(screen.getByText('Username already taken')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('{errors: {field: [...]}} shows "field: msg" for every message', () => {
    render(
      <ErrorMessage
        errors={{ errors: { name: ['Missing data for required field.'], email: ['Not a valid email address.', 'Too long.'] } }}
      />,
    )
    expect(screen.getByText('name: Missing data for required field.')).toBeInTheDocument()
    expect(screen.getByText('email: Not a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('email: Too long.')).toBeInTheDocument()
  })

  it('does not crash on {errors: {...}}, which is an object and not an array', () => {
    //Treating an object as a list (errors.errors.map) throws
    expect(() => render(<ErrorMessage errors={{ errors: { name: ['Required.'] } }} />)).not.toThrow()
  })
})

describe('ErrorMessage fallback', () => {
  it('{message: "Internal Server Error"} shows "Something went wrong"', () => {
    render(<ErrorMessage errors={{ message: 'Internal Server Error' }} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('an unrecognized body shows "Something went wrong"', () => {
    render(<ErrorMessage errors={{}} />)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })

  it('does not also show the fallback when there is a real message', () => {
    render(<ErrorMessage errors={{ error: 'Username and password are required' }} />)
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })
})
