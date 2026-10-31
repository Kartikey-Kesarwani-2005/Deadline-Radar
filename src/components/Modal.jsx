import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * One accessible modal shell for every sheet in the app:
 *   • Esc closes exactly the top layer (capture phase stops the app-wide handler)
 *   • focus moves inside on open, is trapped on Tab, and returns on close
 *   • body scroll is locked so the paper behind cannot drift
 */
export default function Modal({
  label,
  onClose,
  children,
  panelClassName = '',
  align = 'center',
}) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)
  // Parents pass inline arrows, so keep the latest close handler in a ref —
  // otherwise every re-render would tear down the effect and steal focus back
  // to the first field while the user is typing.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    restoreRef.current = document.activeElement
    const body = document.body
    const prevOverflow = body.style.overflow
    body.style.overflow = 'hidden'

    const panel = panelRef.current
    const raf = requestAnimationFrame(() => {
      const target = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE)
      ;(target || panel)?.focus?.()
    })

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeRef.current?.()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.getClientRects().length > 0,
      )
      if (!items.length) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey, true)
      body.style.overflow = prevOverflow
      restoreRef.current?.focus?.()
    }
  }, [])

  return (
    <div
      className={`modal-veil fixed inset-0 z-[70] flex justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[2px] ${
        align === 'top' ? 'items-start pt-[8vh] sm:pt-[12vh]' : 'items-center'
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`modal-panel outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  )
}
