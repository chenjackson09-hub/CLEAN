import { renderHook } from '@testing-library/react'
import { useSaveQueue } from './useSaveQueue'

const deferred = () => {
  let resolve!: (v: boolean) => void
  const promise = new Promise<boolean>((r) => { resolve = r })
  return { promise, resolve }
}

describe('useSaveQueue', () => {
  it('runs saves one after another, in the order they were queued', async () => {
    const { result } = renderHook(() => useSaveQueue())
    const order: string[] = []
    const first = deferred()
    result.current.enqueue(async () => { order.push('first start'); const ok = await first.promise; order.push('first end'); return ok })
    result.current.enqueue(async () => { order.push('second'); return true })
    await Promise.resolve()
    expect(order).toEqual(['first start']) // the second waits
    first.resolve(true)
    await result.current.flush()
    expect(order).toEqual(['first start', 'first end', 'second'])
  })

  it('a failed save does not stop the next one, and flush never throws', async () => {
    const { result } = renderHook(() => useSaveQueue())
    const ran: string[] = []
    result.current.enqueue(async () => { throw new Error('boom') }).catch(() => ran.push('caught'))
    result.current.enqueue(async () => { ran.push('next'); return true })
    await expect(result.current.flush()).resolves.toBeUndefined()
    expect(ran).toContain('next')
  })
})
