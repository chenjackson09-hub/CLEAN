import Home from './page'
import { redirect } from 'next/navigation'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>

describe('Home', () => {
  it('redirects to /login', () => {
    Home()

    expect(mockedRedirect).toHaveBeenCalledWith('/login')
  })
})
