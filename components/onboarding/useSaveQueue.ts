"use client"

import { useCallback, useRef } from "react"

// The wizards save every screen, but the person should never wait for it: Continue moves on at
// once and the save runs in the background. Saves run one after another (so an older screen can
// never overwrite a newer one), and the final submit waits for them with `flush`. Every save
// sends the whole draft, so a failed save is repaired by the next one.
export function useSaveQueue() {
  const tail = useRef<Promise<unknown>>(Promise.resolve())

  const enqueue = useCallback((job: () => Promise<boolean>): Promise<boolean> => {
    const run = tail.current.then(job, job)
    tail.current = run.catch(() => false)
    return run
  }, [])

  const flush = useCallback(async () => {
    await tail.current
  }, [])

  return { enqueue, flush }
}
