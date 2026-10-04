import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CustomerSearch from '../src/components/home/CustomerSearch.jsx'

//Day 2, Step 2: a controlled input that HomePage owns
describe('CustomerSearch', () => {
  it('renders an input labeled "Search customers"', () => {
    render(<CustomerSearch search="" onSearchChange={vi.fn()} />)
    expect(screen.getByLabelText('Search customers')).toBeInTheDocument()
  })

  it('shows the search prop as its value', () => {
    render(<CustomerSearch search="smith" onSearchChange={vi.fn()} />)
    expect(screen.getByLabelText('Search customers')).toHaveValue('smith')
  })

  it('calls onSearchChange with the typed value', () => {
    const onSearchChange = vi.fn()
    render(<CustomerSearch search="" onSearchChange={onSearchChange} />)
    fireEvent.change(screen.getByLabelText('Search customers'), { target: { value: 'ana' } })
    expect(onSearchChange).toHaveBeenCalledTimes(1)
    expect(onSearchChange).toHaveBeenCalledWith('ana')
  })

  it('holds no state of its own: a new search prop replaces the value', () => {
    const { rerender } = render(<CustomerSearch search="ana" onSearchChange={vi.fn()} />)
    rerender(<CustomerSearch search="" onSearchChange={vi.fn()} />)
    expect(screen.getByLabelText('Search customers')).toHaveValue('')
  })
})
