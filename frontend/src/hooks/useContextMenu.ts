import { useContext } from 'react'
import { ContextMenuContext } from 'contexts/ContextMenuContext'

export default function useContextMenu() {
  const context = useContext(ContextMenuContext)
  if (context === undefined) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider')
  }
  return {
    openMenu: context.openMenu,
    closeMenu: context.closeMenu
  }
}
