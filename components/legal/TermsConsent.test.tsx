import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import TermsConsent from './TermsConsent'

describe('TermsConsent', () => {
  it('opens the Terms in a reader over the page (no navigation) and closes back to the same form', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <form>
        <input aria-label="email" defaultValue="me@x.com" />
        <TermsConsent checked={false} onChange={onChange} />
      </form>,
    )
    await user.click(screen.getByRole('button', { name: 'Terms of Use' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument()
    // switch to the other document without leaving the reader
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Privacy Policy' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Close and keep signing up/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('email')).toHaveValue('me@x.com')
    expect(onChange).not.toHaveBeenCalled() // opening the text never ticks the box
  })

  it('closes with Escape', async () => {
    const user = userEvent.setup()
    render(<TermsConsent checked={false} onChange={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Privacy Policy' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
