import { useRef, useContext } from 'react'
import { ContextMenuContext } from 'contexts/ContextMenuContext'
import { CONFIG } from 'constants/config'

export default function ContextMenu() {
  const context = useContext(ContextMenuContext)
  const menuRef = useRef<HTMLDivElement>(null)

  if (!context || !context.isOpen) {
    return null
  }

  const { x, y, items, closeMenu } = context

  const menuWidth = CONFIG.MENU_WIDTH
  const separatorCount = items.filter(item => item.isSeparatorBefore).length
  const menuHeight =
    items.length * CONFIG.MENU_ITEM_HEIGHT +
    separatorCount * CONFIG.MENU_PADDING_AND_SEPARATORS_HEIGHT +
    CONFIG.MENU_PADDING_AND_SEPARATORS_HEIGHT

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1000

  // Deduct a buffer so it doesn't touch the screen edge
  const adjustedTop = y + menuHeight > windowHeight ? Math.max(10, windowHeight - menuHeight - 10) : y
  const adjustedLeft = x + menuWidth > windowWidth ? Math.max(10, windowWidth - menuWidth - 10) : x

  return (
    <div
      ref={menuRef}
      className="fixed bg-bg-card border border-border-default rounded-lg py-1 shadow-xl z-[150] min-w-[165px]"
      style={{ top: adjustedTop, left: adjustedLeft }}
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.isSeparatorBefore && <div className="h-[1px] bg-border-default my-1" />}
          <button
            onClick={() => {
              item.onClick()
              closeMenu()
            }}
            className={`w-full text-left px-3.5 py-1.5 hover:bg-bg-elevated text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              item.isDanger
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-text-primary'
            }`}
          >
            {item.icon && <span className="flex items-center justify-center w-4 h-4">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  )
}
