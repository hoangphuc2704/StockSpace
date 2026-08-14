import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

const TableActionMenu = ({ label = 'Row actions', items = [] }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const availableItems = items.filter(Boolean)

  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current || !menuRef.current) return

    const anchorRect = buttonRef.current.getBoundingClientRect()
    const menuRect = menuRef.current.getBoundingClientRect()
    const viewportPadding = 8
    const gap = 6
    const left = Math.max(
      viewportPadding,
      Math.min(
        anchorRect.right - menuRect.width,
        window.innerWidth - menuRect.width - viewportPadding
      )
    )
    const opensUpward =
      anchorRect.bottom + gap + menuRect.height > window.innerHeight - viewportPadding
    const top = opensUpward
      ? Math.max(viewportPadding, anchorRect.top - menuRect.height - gap)
      : anchorRect.bottom + gap

    setPosition({ left, top })
  }, [isOpen, availableItems.length])

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsideClick = (event) => {
      if (!buttonRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const closeMenu = () => setIsOpen(false)
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [isOpen])

  if (!availableItems.length) return <span className="text-slate-300">—</span>

  return (
    <div className="inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPosition(null)
          setIsOpen((current) => !current)
        }}
        aria-label={label}
        aria-expanded={isOpen}
        className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <MoreVertical className="h-5 w-5" />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              left: position?.left ?? -9999,
              top: position?.top ?? -9999,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="fixed z-[1000] max-w-64 min-w-40 rounded-xl border border-slate-200 bg-white p-1 text-left shadow-xl"
          >
            {availableItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return
                    setIsOpen(false)
                    item.onClick?.()
                  }}
                  className={`flex w-full items-center rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    item.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="mr-2 h-4 w-4" />}
                  {item.label}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}

export default TableActionMenu
