import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from 'contexts/AppContext'
import { createClient } from 'lib/supabase/client'
import { Trash2, RotateCcw, CheckSquare, Square, Loader2 } from 'lucide-react'
import { UI } from 'constants/ui'
import { CONFIG } from 'constants/config'
import { API_ENDPOINTS } from 'constants/api'
import { logger } from 'utils/logger'

interface DeletedReel {
  id: string
  instagram_url: string
  thumbnail_url: string | null
  note: string
  instagram_username?: string | null
  instagram_caption?: string | null
  deleted_at: string
  original_folder_id: string
}

interface DeletedFolder {
  id: string
  name: string
  created_at: string
  deleted_at: string
  parent_id: string | null
}

export default function RecycleBin() {
  const { user, refreshFolders, searchQuery, folders } = useApp()
  const supabase = createClient()

  const [reels, setReels] = useState<DeletedReel[]>([])
  const [deletedFolders, setDeletedFolders] = useState<DeletedFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [restoring, setRestoring] = useState(false)
  const [emptying, setEmptying] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)

  // Fetch soft-deleted reels and folders concurrently
  const fetchDeletedData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    try {
      const sevenDaysAgo = new Date(Date.now() - CONFIG.RECYCLE_BIN_EXPIRY_MS).toISOString()

      const [
        { data: reelsData, error: reelsErr },
        { data: foldersData, error: foldersErr }
      ] = await Promise.all([
        supabase
          .from('reels')
          .select('id, instagram_url, thumbnail_url, note, instagram_username, instagram_caption, deleted_at, original_folder_id')
          .eq('user_id', user.id)
          .eq('is_deleted', true)
          .gte('deleted_at', sevenDaysAgo)
          .order('deleted_at', { ascending: false }),
        supabase
          .from('folders')
          .select('id, name, created_at, deleted_at, parent_id')
          .eq('user_id', user.id)
          .eq('is_deleted', true)
          .gte('deleted_at', sevenDaysAgo)
          .order('deleted_at', { ascending: false })
      ])

      if (!reelsErr) setReels(reelsData || [])

      if (!foldersErr && foldersData) {
        // Optimize parent lookup using a Set (O(N) instead of O(N^2))
        const deletedFolderIds = new Set(foldersData.map(f => f.id))
        const topLevelDeletedFolders = foldersData.filter(f =>
          !f.parent_id || !deletedFolderIds.has(f.parent_id)
        )
        setDeletedFolders(topLevelDeletedFolders)
      }
    } catch (err) {
      logger.error('Error fetching deleted data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchDeletedData()
  }, [fetchDeletedData])

  // Memoize search filtering to prevent re-calculations
  const filteredReels = useMemo(() => {
    if (!searchQuery) return reels
    const lowerQuery = searchQuery.toLowerCase()
    return reels.filter(reel =>
      reel.note.toLowerCase().includes(lowerQuery) ||
      reel.instagram_url.toLowerCase().includes(lowerQuery)
    )
  }, [reels, searchQuery])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredReels.length ? [] : filteredReels.map(r => r.id))
  }

  const handleRestoreFolder = async (folderId: string) => {
    setRestoring(true)
    try {
      const { error } = await supabase
        .from('folders')
        .update({ is_deleted: false, deleted_at: null })
        .eq('id', folderId)

      if (!error) {
        setDeletedFolders(prev => prev.filter(f => f.id !== folderId))
        await refreshFolders()
      }
    } catch (err) {
      logger.error('Error restoring folder:', err)
    } finally {
      setRestoring(false)
    }
  }

  const handleRestoreSingle = async (reel: DeletedReel, e: React.MouseEvent) => {
    e.stopPropagation()
    setRestoring(true)

    try {
      const isOriginalFolderDeleted = !folders.some(f => f.id === reel.original_folder_id)
      if (isOriginalFolderDeleted) {
        alert(UI.ERRORS.REEL_PARENT_DELETED)
        return
      }

      const { error } = await supabase
        .from('reels')
        .update({ is_deleted: false, deleted_at: null, folder_id: reel.original_folder_id })
        .eq('id', reel.id)

      if (!error) {
        setReels(prev => prev.filter(r => r.id !== reel.id))
        setSelectedIds(prev => prev.filter(x => x !== reel.id))
        await refreshFolders()
      }
    } catch (err) {
      logger.error('Error restoring reel:', err)
    } finally {
      setRestoring(false)
    }
  }

  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return
    setRestoring(true)

    try {
      const reelsToRestore = reels.filter(r => selectedIds.includes(r.id))
      const restorableReels = reelsToRestore.filter(reel =>
        folders.some(f => f.id === reel.original_folder_id)
      )

      if (restorableReels.length < reelsToRestore.length) {
        alert(UI.ERRORS.BATCH_RESTORE_OMITTED)
      }

      if (restorableReels.length === 0) return

      await Promise.all(
        restorableReels.map((reel) =>
          supabase
            .from('reels')
            .update({ is_deleted: false, deleted_at: null, folder_id: reel.original_folder_id })
            .eq('id', reel.id)
        )
      )

      const restoredIds = new Set(restorableReels.map(r => r.id))
      setReels(prev => prev.filter(r => !restoredIds.has(r.id)))
      setSelectedIds(prev => prev.filter(id => !restoredIds.has(id)))
      await refreshFolders()
    } catch (err) {
      logger.error('Error restoring batch:', err)
    } finally {
      setRestoring(false)
    }
  }

  const handleConfirmEmptyBin = async () => {
    if (!user) return
    setEmptying(true)

    try {
      // Execute both hard deletes concurrently
      const [
        { error: folderErr },
        { error: reelErr }
      ] = await Promise.all([
        supabase.from('folders').delete().eq('user_id', user.id).eq('is_deleted', true),
        supabase.from('reels').delete().eq('user_id', user.id).eq('is_deleted', true)
      ])

      if (!folderErr && !reelErr) {
        setReels([])
        setDeletedFolders([])
        setSelectedIds([])
        await refreshFolders()
        setShowEmptyConfirm(false)
      }
    } catch (err) {
      logger.error('Error emptying bin:', err)
    } finally {
      setEmptying(false)
    }
  }

  const getDaysLeft = (deletedAtStr: string) => {
    const deletedAt = new Date(deletedAtStr)
    const expiryDate = new Date(deletedAt.getTime() + CONFIG.RECYCLE_BIN_EXPIRY_MS)
    const diffTime = expiryDate.getTime() - Date.now()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return UI.LABELS.EXPIRES_SOON
    if (diffDays === 1) return UI.LABELS.DAY_LEFT
    return `${diffDays} ${UI.LABELS.DAYS_LEFT_SUFFIX}`
  }

  return (
    <div className="flex-1 flex flex-col p-8 bg-bg-base">
      {/* Header & Controls */}
      <div className="flex justify-between items-start mb-8 px-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary select-none">{UI.TITLES.RECYCLE_BIN}</h2>
          <p className="text-sm text-text-muted mt-1 leading-normal select-none">{UI.TITLES.RECYCLE_BIN_DESC}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEmptyConfirm(true)}
            disabled={(reels.length === 0 && deletedFolders.length === 0) || emptying}
            className="btn-destructive flex items-center gap-2 h-10 py-0 cursor-pointer"
          >
            {emptying ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            {UI.BUTTONS.EMPTY_BIN}
          </button>
          <button
            onClick={handleRestoreSelected}
            disabled={selectedIds.length === 0 || restoring}
            className="btn-primary flex items-center gap-2 h-10 py-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {restoring ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
            {UI.BUTTONS.RESTORE_SELECTED}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20"><Loader2 className="animate-spin text-text-secondary" size={28} /></div>
      ) : reels.length === 0 && deletedFolders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-24 px-4 bg-bg-surface text-center">
          <Trash2 className="text-text-muted mb-4 opacity-50" size={56} strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">{UI.LABELS.RECYCLE_BIN_EMPTY}</h3>
          <p className="text-sm text-text-secondary max-w-sm">{UI.LABELS.RECYCLE_BIN_EMPTY_DESC}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-12">

          {/* Deleted Folders */}
          {deletedFolders.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono tracking-widest text-text-muted uppercase mb-4 px-1 select-none">{UI.LABELS.SUBFOLDERS} ({deletedFolders.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {deletedFolders.map((folder) => (
                  <div key={folder.id} className="group relative rounded-xl border border-red-500/20 bg-bg-card overflow-hidden transition-all flex flex-col hover:border-red-500/40">
                    <div className="relative h-[60px] bg-bg-elevated flex items-center justify-center border-b border-border-subtle select-none">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
                        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                      </svg>
                      <button
                        onClick={() => handleRestoreFolder(folder.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-bg-surface hover:bg-accent hover:text-bg-base border border-border-default text-text-secondary shadow-sm cursor-pointer"
                        title={UI.BUTTONS.RESTORE_FOLDER}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                    <div className="p-3.5 flex flex-col justify-between flex-1 min-h-[70px]">
                      <p className="text-sm font-semibold text-text-primary truncate" title={folder.name}>{folder.name}</p>
                      <span className="text-[10px] font-semibold text-red-400/90 font-mono tracking-wide mt-1 select-none">{UI.LABELS.WARNING_LABEL}{getDaysLeft(folder.deleted_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deleted Reels */}
          {reels.length > 0 && (
            <div>
              <h3 className="text-[10px] font-mono tracking-widest text-text-muted uppercase mb-4 px-1 select-none">{UI.LABELS.REELS} ({reels.length})</h3>

              <div className="flex items-center gap-2 mb-4 px-1 text-xs text-text-secondary select-none">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 font-medium hover:text-text-primary transition-colors py-1.5 cursor-pointer bg-transparent border-none">
                  {selectedIds.length === filteredReels.length && filteredReels.length > 0 ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
                  {UI.LABELS.SELECT_ALL} ({selectedIds.length} {UI.LABELS.OF} {filteredReels.length} {UI.LABELS.SELECTED})
                </button>
              </div>

              {filteredReels.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-20 px-4 bg-bg-surface text-center">
                  <h3 className="text-lg font-semibold text-text-primary mb-1">{UI.LABELS.NO_MATCHES_FOUND}</h3>
                  <p className="text-sm text-text-secondary max-w-sm">{UI.LABELS.NO_DELETED_REELS_MATCH}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                  {filteredReels.map((reel) => {
                    const isSelected = selectedIds.includes(reel.id)
                    return (
                      <div key={reel.id} onClick={() => toggleSelect(reel.id)} className={`group relative rounded-xl border bg-bg-card overflow-hidden flex flex-col shadow-md cursor-pointer transition-all duration-150 ${isSelected ? 'border-accent shadow-[0_0_0_2px_var(--accent)]' : 'border-red-500/20 hover:border-red-500/40'}`}>
                        <div className="absolute top-2.5 left-2.5 z-10 w-6 h-6 flex items-center justify-center bg-black/60 rounded-md border border-white/20">
                          {isSelected ? <CheckSquare size={16} className="text-text-primary" /> : <Square size={16} className="text-text-secondary" />}
                        </div>
                        <button onClick={(e) => handleRestoreSingle(reel, e)} className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 hover:bg-black text-text-primary p-2 rounded-lg border border-border-default shadow-md cursor-pointer" title={UI.BUTTONS.RESTORE_FOLDER}>
                          <RotateCcw size={14} />
                        </button>
                        <div className="relative aspect-[9/16] w-full bg-bg-elevated overflow-hidden">
                          {reel.thumbnail_url && !reel.thumbnail_url.includes('images.unsplash.com') ? (
                            <img
                              src={reel.thumbnail_url.includes('cdninstagram.com') || reel.thumbnail_url.includes('fbcdn.net') ? `${API_ENDPOINTS.PROXY_IMAGE}?url=${encodeURIComponent(reel.thumbnail_url)}` : reel.thumbnail_url}
                              alt="Reel thumbnail"
                              className="w-full h-full object-cover grayscale opacity-80"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#161616] to-[#0A0A0A] text-center select-none relative group/mock grayscale opacity-80">
                              <span className="text-[10px] font-mono tracking-[0.2em] text-text-muted uppercase mt-2">{UI.LABELS.INSTAGRAM_REEL}</span>
                              <div className="w-14 h-14 rounded-full bg-[#111] border border-border-default flex items-center justify-center text-text-secondary"><Trash2 size={20} className="text-text-muted" /></div>
                              <div className="mb-2 text-[11px] font-mono text-text-muted flex items-center gap-1.5 justify-center">{UI.LABELS.INSTAGRAM_COM}</div>
                            </div>
                          )}

                          {/* Bottom shadow gradient for username text readability */}
                          <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-10" />

                          {/* Instagram logo and username overlay (with grayscale/low opacity) with placeholder fallback */}
                          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 text-xs text-white/70 font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] select-none pointer-events-none">
                            <div className="w-5 h-5 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-75"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                            </div>
                            <span className={reel.instagram_username ? "" : "text-white/40 italic font-normal"}>
                              @{reel.instagram_username || 'username'}
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 flex flex-col border-t border-border-subtle bg-bg-surface/20 flex-1 justify-between min-h-[95px]">
                          <div>
                            <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed mb-2 italic" title={reel.instagram_caption || 'No caption available.'}>
                              "{reel.instagram_caption || 'No caption available.'}"
                            </p>
                            <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-2">{reel.note || <span className="italic">{UI.LABELS.NO_NOTE}</span>}</p>
                          </div>
                          <span className="text-[11px] font-semibold text-red-400/90 font-mono tracking-wide select-none">{UI.LABELS.WARNING_LABEL}{getDaysLeft(reel.deleted_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showEmptyConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-5"><Trash2 size={20} /></div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{UI.TITLES.EMPTY_BIN}</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">{UI.TITLES.EMPTY_BIN_CONFIRM}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowEmptyConfirm(false)} className="btn-ghost px-5 py-2.5 h-[40px] text-xs font-semibold cursor-pointer" disabled={emptying}>{UI.BUTTONS.CANCEL}</button>
              <button onClick={handleConfirmEmptyBin} className="btn-destructive px-5 py-2.5 h-[40px] text-xs font-semibold !bg-red-500 !text-white hover:!bg-red-600 border-none flex items-center justify-center gap-2 cursor-pointer" disabled={emptying}>{emptying ? UI.BUTTONS.EMPTYING : UI.BUTTONS.EMPTY_BIN}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}