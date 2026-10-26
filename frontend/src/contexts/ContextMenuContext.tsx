import { createContext, useState, useEffect, useCallback } from 'react'

export interface ContextMenuItem {
  label: string
  icon?: string | React.ReactNode
  onClick: () => void
  isDanger?: boolean
  isSeparatorBefore?: boolean
}

interface ContextMenuContextType {
  isOpen: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  openMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void
  closeMenu: () => void
}

export const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined)

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [x, setX] = useState(0)
  const [y, setY] = useState(0)
  const [items, setItems] = useState<ContextMenuItem[]>([])

  const openMenu = useCallback((e: React.MouseEvent, newItems: ContextMenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    setX(e.clientX)
    setY(e.clientY)
    setItems(newItems)
    setIsOpen(true)
  }, [])

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Close context menu on any document click
  useEffect(() => {
    if (!isOpen) return

    const handleOutsideClick = () => {
      closeMenu()
    }

    document.addEventListener('click', handleOutsideClick)
    return () => {
      document.removeEventListener('click', handleOutsideClick)
    }
  }, [isOpen, closeMenu])

  return (
    <ContextMenuContext.Provider
      value={{
        isOpen,
        x,
        y,
        items,
        openMenu,
        closeMenu
      }}
    >
      {children}
    </ContextMenuContext.Provider>
  )
}
