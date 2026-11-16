import '@testing-library/jest-dom'

// React's cache() is a Server Components API that isn't present in the jsdom
// test runtime, yet lib/supabase/server.ts imports it. Polyfill it as an
// identity wrapper so suites that transitively import server code can load.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('react')
if (typeof React.cache !== 'function') {
  React.cache = <T,>(fn: T): T => fn
}

// useFormState / useFormStatus (React 19 / canary form APIs) aren't present in
// the test runtime's react-dom. Shim them so form components can render.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ReactDOM = require('react-dom')
if (typeof ReactDOM.useFormState !== 'function') {
  // Faithful-enough shim: threads state and calls action(prevState, formData)
  // when the returned formAction is invoked (mirrors the real signature).
  ReactDOM.useFormState = (action: (prev: unknown, fd: unknown) => unknown, initialState: unknown) => {
    const [state, setState] = React.useState(initialState)
    const formAction = async (formData: unknown) => {
      const result = await action(state, formData)
      setState(result)
    }
    return [state, formAction]
  }
}
if (typeof ReactDOM.useFormStatus !== 'function') {
  ReactDOM.useFormStatus = () => ({ pending: false })
}

// Default mock for Next.js navigation hooks so client components that call
// useRouter()/useSearchParams() can render in tests. Individual suites can
// still override this with their own jest.mock('next/navigation', ...).
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))
