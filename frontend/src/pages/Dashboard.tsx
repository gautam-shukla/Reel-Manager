import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from 'contexts/AppContext'
import { createClient } from 'lib/supabase/client'
import { FolderPlus, FolderOpen, Trash2, Loader2, Edit, Trash, Info } from 'lucide-react'
import useContextMenu from 'hooks/useContextMenu'
import { UI } from 'constants/ui'
import { logger } from 'utils/logger'

export default function Dashboard() {
  const { folders, searchQuery, setIsAddFolderOpen, refreshFolders, user } = useApp()
  const navigate = useNavigate()
  const supabase = createClient()
  const { openMenu } = useContextMenu()

  // State
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [folderToRename, setFolderToRename] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  const [folderProperties, setFolderProperties] = useState<{
    name: string
    created_at: string
    updated_at: string
    reelsCount?: number
    subfoldersCount?: number
    totalItems?: number
    loading: boolean
  } | null>(null)

  // 1. Memoize filtered folders to prevent re-calculations on modal toggles/typing
  const filteredFolders = useMemo(() => {
    const rootFolders = folders.filter((f) => !f.parent_id)
    if (!searchQuery) return rootFolders

    const lowerQuery = searchQuery.toLowerCase()
    return rootFolders.filter((f) => f.name.toLowerCase().includes(lowerQuery))
  }, [folders, searchQuery])

  // Handlers
  const handleDeleteFolderCard = (folderId: string, folderName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setFolderToDelete({ id: folderId, name: folderName })
  }

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete || !user) return
    setIsDeleting(true)

    try {
      const { error } = await supabase.from('folders').update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }).eq('id', folderToDelete.id)

      if (!error) {
        await refreshFolders()
        setFolderToDelete(null)
      } else {
        alert(`${UI.ERRORS.DELETE_ERROR}${error.message}`)
      }
    } catch (err) {
      logger.error('Error deleting folder:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTriggerRename = (folderId: string, folderName: string) => {
    setFolderToRename({ id: folderId, name: folderName })
    setRenameValue(folderName)
    setRenameError(null)
  }

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderToRename || !renameValue.trim()) return
    setIsRenaming(true)
    setRenameError(null)

    try {
      const { error } = await supabase.from('folders').update({
        name: renameValue.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', folderToRename.id)

      if (error) throw error

      await refreshFolders()
      setFolderToRename(null)
    } catch (err: any) {
      setRenameError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
    } finally {
      setIsRenaming(false)
    }
  }

  // 2. Parallelize network requests for properties
  const handleShowProperties = async (folder: any) => {
    setFolderProperties({ name: folder.name, created_at: folder.created_at, updated_at: folder.updated_at || folder.created_at, loading: true })

    try {
      const [
        { count: reelsCount },
        { count: subfoldersCount }
      ] = await Promise.all([
        supabase.from('reels').select('*', { count: 'exact', head: true }).eq('folder_id', folder.id).eq('is_deleted', false),
        supabase.from('folders').select('*', { count: 'exact', head: true }).eq('parent_id', folder.id).eq('is_deleted', false)
      ])

      setFolderProperties({
        name: folder.name,
        created_at: folder.created_at,
        updated_at: folder.updated_at || folder.created_at,
        reelsCount: reelsCount || 0,
        subfoldersCount: subfoldersCount || 0,
        totalItems: (reelsCount || 0) + (subfoldersCount || 0),
        loading: false
      })
    } catch (err) {
      logger.error('Error fetching folder properties:', err)
      setFolderProperties(null)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }

  // 3. Stabilize context menu handler
  const handleTriggerContextMenu = useCallback((e: React.MouseEvent, folder: any) => {
    openMenu(e, [
      { label: UI.BUTTONS.RENAME, icon: <Edit size={14} />, onClick: () => handleTriggerRename(folder.id, folder.name) },
      { label: UI.BUTTONS.DELETE, icon: <Trash size={14} />, isDanger: true, onClick: () => handleDeleteFolderCard(folder.id, folder.name) },
      { label: UI.BUTTONS.PROPERTIES, icon: <Info size={14} />, isSeparatorBefore: true, onClick: () => handleShowProperties(folder) }
    ])
  }, [openMenu])

  return (
    <div className="flex-1 flex flex-col p-8 bg-bg-base relative">

      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary select-none">
          {UI.TITLES.MY_FOLDERS}
        </h2>
      </div>

      {/* Folders Grid */}
      {folders.filter(f => !f.parent_id).length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-default rounded-xl py-24 px-4 bg-bg-surface text-center">
          <FolderPlus className="text-text-muted mb-4" size={56} strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">{UI.LABELS.NO_FOLDERS_YET}</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-sm">{UI.LABELS.NO_FOLDERS_YET_DESC}</p>
          <button onClick={() => setIsAddFolderOpen(true)} className="btn-primary cursor-pointer">{UI.BUTTONS.CREATE_FOLDER}</button>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-24 px-4 bg-bg-surface text-center">
          <FolderOpen className="text-text-muted mb-4" size={56} strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">{UI.LABELS.NO_FOLDERS_MATCH}</h3>
          <p className="text-sm text-text-secondary max-w-sm">{UI.LABELS.NO_FOLDERS_MATCH_DESC}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => navigate(`/folder/${folder.id}`)}
              onContextMenu={(e) => handleTriggerContextMenu(e, folder)}
              className="group cursor-pointer rounded-xl border border-border-default bg-bg-card overflow-hidden hover:border-text-secondary hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all flex flex-col"
            >
              <div className="relative h-[60px] bg-bg-elevated flex items-center justify-center border-b border-border-subtle group-hover:bg-border-default transition-colors">
                <FolderIcon />
                <button
                  onClick={(e) => handleDeleteFolderCard(folder.id, folder.name, e)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-bg-surface hover:bg-destructive hover:text-white border border-border-default text-text-muted hover:border-destructive shadow-sm cursor-pointer"
                  title={UI.BUTTONS.DELETE}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <p className="text-sm font-semibold text-text-primary group-hover:text-accent truncate" title={folder.name}>{folder.name}</p>
                <p className="text-xs text-text-muted mt-0.5 select-none">{folder.reelsCount} {folder.reelsCount === 1 ? UI.LABELS.REEL : UI.LABELS.REELS}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rename Dialog Modal */}
      {folderToRename && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">{UI.TITLES.RENAME_FOLDER}</h3>
            <form onSubmit={handleRenameFolder} className="space-y-6">
              {renameError && <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">{renameError}</div>}
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">{UI.LABELS.FOLDER_NAME}</label>
                <input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none" required autoFocus />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFolderToRename(null)} className="btn-ghost cursor-pointer" disabled={isRenaming}>{UI.BUTTONS.CANCEL}</button>
                <button type="submit" className="btn-primary cursor-pointer" disabled={isRenaming}>{isRenaming ? UI.BUTTONS.RENAMING : UI.BUTTONS.RENAME}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Properties Dialog Modal */}
      {folderProperties && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[420px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2 select-none">{UI.TITLES.FOLDER_PROPERTIES}</h3>
            {folderProperties.loading ? (
              <div className="py-12 flex justify-center items-center"><Loader2 className="animate-spin text-text-secondary" size={24} /></div>
            ) : (
              <div className="space-y-5">
                <div className="flex justify-between border-b border-border-subtle pb-3"><span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.NAME}</span><span className="text-sm font-semibold text-text-primary">{folderProperties.name}</span></div>
                <div className="flex justify-between border-b border-border-subtle pb-3"><span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.DATE_ADDED}</span><span className="text-sm font-medium text-text-secondary">{formatDate(folderProperties.created_at)}</span></div>
                <div className="flex justify-between border-b border-border-subtle pb-3"><span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.LAST_MODIFIED}</span><span className="text-sm font-medium text-text-secondary">{formatDate(folderProperties.updated_at)}</span></div>
                <div className="flex justify-between border-b border-border-subtle pb-3">
                  <span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.NO_OF_ITEMS}</span>
                  <span className="text-sm font-bold text-accent">
                    {folderProperties.totalItems} {folderProperties.totalItems === 1 ? UI.LABELS.ITEM : UI.LABELS.ITEMS}
                    <span className="text-xs font-normal text-text-muted block text-right mt-0.5">({folderProperties.reelsCount} {UI.LABELS.REELS}, {folderProperties.subfoldersCount} {UI.LABELS.SUBFOLDERS})</span>
                  </span>
                </div>
                <div className="flex justify-end pt-4"><button type="button" onClick={() => setFolderProperties(null)} className="btn-primary px-6 cursor-pointer">{UI.BUTTONS.CLOSE}</button></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-5"><Trash2 size={20} /></div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{UI.TITLES.DELETE_FOLDER}</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">Are you sure you want to move the folder <span className="text-text-primary font-semibold font-mono bg-bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">&ldquo;{folderToDelete.name}&rdquo;</span> to the Recycle Bin?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setFolderToDelete(null)} className="btn-ghost px-5 py-2.5 h-[40px] text-xs font-semibold cursor-pointer" disabled={isDeleting}>{UI.BUTTONS.CANCEL}</button>
              <button onClick={handleConfirmDeleteFolder} className="btn-destructive px-5 py-2.5 h-[40px] text-xs font-semibold !bg-red-500 !text-white hover:!bg-red-600 border-none flex items-center justify-center gap-2 cursor-pointer" disabled={isDeleting}>{isDeleting ? UI.BUTTONS.DELETING : UI.BUTTONS.MOVE_TO_BIN}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FolderIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary group-hover:text-text-primary transition-colors">
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
    </svg>
  )
}