'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AUTO_REFRESH_MS, shouldAutoRefresh } from '@/lib/autoRefresh'

/**
 * Headless: re-reads the page's data every 2 minutes while the tab is visible, and straight away
 * when the person comes back to a tab that has been idle longer than that. Skips while they are
 * typing, when offline, and on pages that update live (chat) or are mid-form (sign-up).
 */
export default function AutoRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const lastRef = useRef(Date.now())
  // The path changes on every navigation (which already loads fresh data) — restart the clock.
  useEffect(() => {
    lastRef.current = Date.now()
  }, [pathname])

  useEffect(() => {
    function tryRefresh() {
      const ok = shouldAutoRefresh({
        hidden: document.hidden,
        online: navigator.onLine,
        pathname,
        activeElement: document.activeElement,
      })
      if (!ok) return
      lastRef.current = Date.now()
      router.refresh()
    }
    const timer = window.setInterval(() => {
      if (Date.now() - lastRef.current >= AUTO_REFRESH_MS - 1000) tryRefresh()
    }, 15_000)
    function onVisible() {
      if (!document.hidden && Date.now() - lastRef.current >= AUTO_REFRESH_MS) tryRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, pathname])

  return null
}
