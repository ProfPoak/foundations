import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ListStatus from '../src/components/shared/ListStatus.jsx'

//Shows exactly one of: Loading, the errors, the empty message, or the list (its children)
function renderStatus(props) {
  return render(
    <ListStatus loading={false} errors={null} isEmpty={false} emptyMessage="Nothing here" {...props}>
      <ul><li>the list</li></ul>
    </ListStatus>,
  )
}

describe('ListStatus', () => {
  it('shows Loading, and nothing else, while loading', () => {
    renderStatus({ loading: true, errors: { error: 'Nope' }, isEmpty: true })
    expect(screen.getByText(/^Loading/)).toBeInTheDocument()
    expect(screen.queryByText('Nope')).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument()
    expect(screen.queryByText('the list')).not.toBeInTheDocument()
  })

  it('shows the errors instead of the empty message or the list', () => {
    renderStatus({ errors: { error: 'Nope' }, isEmpty: true })
    expect(screen.getByText('Nope')).toBeInTheDocument()
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument()
    expect(screen.queryByText('the list')).not.toBeInTheDocument()
  })

  it('shows "Something went wrong" for an empty error body', () => {
    renderStatus({ errors: {} })
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows the empty message when the list is empty', () => {
    renderStatus({ isEmpty: true })
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.queryByText('the list')).not.toBeInTheDocument()
  })

  it('shows the list otherwise', () => {
    renderStatus()
    expect(screen.getByText('the list')).toBeInTheDocument()
    expect(screen.queryByText(/^Loading/)).not.toBeInTheDocument()
    expect(screen.queryByText('Nothing here')).not.toBeInTheDocument()
  })
})
