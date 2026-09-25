import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { useAuth } from '../src/context/AuthContext.jsx'
import LoginForm from '../src/components/auth/LoginForm.jsx'
import SignupForm from '../src/components/auth/SignupForm.jsx'

//Day 1, Steps 13 and 14: LoginForm and SignupForm
//useAuth is mocked, so these tests check what the form does with login/signup's result.
//The real ErrorMessage renders the errors, so Step 12 needs to pass first.
//Inputs are found by their <label>, so give each input a label ("Username", "Password").
vi.mock('../src/context/AuthContext.jsx', () => ({ useAuth: vi.fn() }))

const ADMIN = { id: 1, username: 'admin', is_admin: true }
let auth

beforeEach(() => {
  auth = {
    user: null,
    checkingSession: false,
    login: vi.fn(async () => ({ ok: true, status: 200, data: { token: 't', user: ADMIN } })),
    signup: vi.fn(async () => ({ ok: true, status: 201, data: { token: 't', user: ADMIN } })),
    logout: vi.fn(),
  }
  useAuth.mockReset()
  useAuth.mockReturnValue(auth)
})

//The form sits at its page's path, with a marker page at / so a navigate('/') is visible
function renderForm(Form, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Form />} />
        <Route path="/" element={<h1>Home marker</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

function usernameInput() {
  return screen.getByLabelText(/username/i)
}

//Anchored so a "Confirm password" field doesn't also match
function passwordInput() {
  return screen.getByLabelText(/^password\b/i)
}

function confirmInput() {
  return screen.queryByLabelText(/confirm/i)
}

//Fills every field; a confirm field, if there is one, gets the same password
function fill(username, password) {
  fireEvent.change(usernameInput(), { target: { value: username } })
  fireEvent.change(passwordInput(), { target: { value: password } })
  const confirm = confirmInput()
  if (confirm) fireEvent.change(confirm, { target: { value: password } })
}

describe.each([
  { name: 'LoginForm (Step 13)', Form: LoginForm, path: '/login', fn: 'login', button: /log ?in/i, link: /sign ?up/i, linkTo: '/signup' },
  { name: 'SignupForm (Step 14)', Form: SignupForm, path: '/signup', fn: 'signup', button: /sign ?up/i, link: /log ?in/i, linkTo: '/login' },
])('$name', ({ Form, path, fn, button, link, linkTo }) => {
  function submitButton() {
    return screen.getByRole('button', { name: button })
  }

  describe('fields', () => {
    it('has a username input, a password input and a submit button', () => {
      renderForm(Form, path)
      expect(usernameInput()).toBeInTheDocument()
      expect(passwordInput()).toBeInTheDocument()
      expect(submitButton()).toBeInTheDocument()
    })

    it('hides the password with type="password"', () => {
      renderForm(Form, path)
      expect(passwordInput()).toHaveAttribute('type', 'password')
    })

    it('keeps the typed values (controlled inputs)', () => {
      renderForm(Form, path)
      fill('someone', 'secret123')
      expect(usernameInput()).toHaveValue('someone')
      expect(passwordInput()).toHaveValue('secret123')
    })

    it(`links to ${linkTo}`, () => {
      renderForm(Form, path)
      expect(screen.getByRole('link', { name: link })).toHaveAttribute('href', linkTo)
    })

    it('shows no error before the first submit', () => {
      renderForm(Form, path)
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  describe('submit', () => {
    it('is a real <form> submit that prevents the page reload', () => {
      renderForm(Form, path)
      fill('someone', 'secret123')
      const form = submitButton().closest('form')
      expect(form).not.toBeNull()
      //fireEvent returns false when the handler called preventDefault
      expect(fireEvent.submit(form)).toBe(false)
    })

    it(`calls ${fn}(username, password) with the typed values`, async () => {
      renderForm(Form, path)
      fill('someone', 'secret123')
      fireEvent.click(submitButton())
      await waitFor(() => expect(auth[fn]).toHaveBeenCalledWith('someone', 'secret123'))
      expect(auth[fn]).toHaveBeenCalledTimes(1)
    })

    it('on success: navigates to /', async () => {
      renderForm(Form, path)
      fill('someone', 'secret123')
      fireEvent.click(submitButton())
      expect(await screen.findByText('Home marker')).toBeInTheDocument()
    })
  })

  describe('errors', () => {
    it('on failure: shows the error from the result data and stays on the page', async () => {
      auth[fn].mockResolvedValue({ ok: false, status: 401, data: { error: 'Login failed. Please check Username and Password' } })
      renderForm(Form, path)
      fill('someone', 'wrong')
      fireEvent.click(submitButton())
      expect(await screen.findByText('Login failed. Please check Username and Password')).toBeInTheDocument()
      expect(screen.queryByText('Home marker')).not.toBeInTheDocument()
      expect(submitButton()).toBeInTheDocument()
    })

    it('on failure: shows every message in an {errors: [...]} body', async () => {
      auth[fn].mockResolvedValue({ ok: false, status: 400, data: { errors: ['Username already taken', 'Password must be at least 8 characters'] } })
      renderForm(Form, path)
      fill('admin', 'short')
      fireEvent.click(submitButton())
      expect(await screen.findByText('Username already taken')).toBeInTheDocument()
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    })

    it('on a 500 with no JSON body (data: null): still shows "Something went wrong"', async () => {
      //ErrorMessage renders nothing for null, so the form must not pass a bare null through
      auth[fn].mockResolvedValue({ ok: false, status: 500, data: null })
      renderForm(Form, path)
      fill('someone', 'secret123')
      fireEvent.click(submitButton())
      expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('clears the old error as soon as the form is submitted again', async () => {
      auth[fn].mockResolvedValueOnce({ ok: false, status: 401, data: { error: 'Old error' } })
      renderForm(Form, path)
      fill('someone', 'wrong')
      fireEvent.click(submitButton())
      expect(await screen.findByText('Old error')).toBeInTheDocument()

      //The second request never answers, so the error can only disappear if submit cleared it first
      auth[fn].mockReturnValueOnce(new Promise(() => {}))
      fireEvent.click(submitButton())
      await waitFor(() => expect(screen.queryByText('Old error')).not.toBeInTheDocument())
    })
  })
})

describe('SignupForm confirm password (Step 14, optional)', () => {
  it('shows "Passwords do not match" and does not call signup when they differ', ({ skip }) => {
    renderForm(SignupForm, '/signup')
    const confirm = confirmInput()
    if (!confirm) skip()
    fireEvent.change(usernameInput(), { target: { value: 'someone' } })
    fireEvent.change(passwordInput(), { target: { value: 'secret123' } })
    fireEvent.change(confirm, { target: { value: 'different' } })
    fireEvent.click(screen.getByRole('button', { name: /sign ?up/i }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(auth.signup).not.toHaveBeenCalled()
  })
})
