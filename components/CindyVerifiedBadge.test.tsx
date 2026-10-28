import { render, screen } from '@testing-library/react'
import { CindyVerifiedBadge } from './CindyVerifiedBadge'

describe('CindyVerifiedBadge', () => {
  it('says Cindy Verified in English and Hebrew', () => {
    const { rerender } = render(<CindyVerifiedBadge />)
    expect(screen.getByText('Cindy Verified')).toBeInTheDocument()
    rerender(<CindyVerifiedBadge lang="he" />)
    expect(screen.getByText('מאומת Cindy')).toBeInTheDocument()
  })
})
