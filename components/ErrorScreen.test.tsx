import { render, screen, fireEvent } from '@testing-library/react'
import ErrorScreen from './ErrorScreen'

describe('ErrorScreen', () => {
  afterEach(() => { document.documentElement.dir = 'ltr' })

  it('page not found: explains and offers the way back', () => {
    render(<ErrorScreen kind="not-found" />)
    expect(screen.getByText("We couldn't find that page")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Clean' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('error: offers to try again', () => {
    const retry = jest.fn()
    render(<ErrorScreen kind="error" onRetry={retry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalled()
  })

  it('follows the page direction into Hebrew', () => {
    document.documentElement.dir = 'rtl'
    render(<ErrorScreen kind="not-found" />)
    expect(screen.getByText('לא מצאנו את העמוד הזה')).toBeInTheDocument()
  })
})
