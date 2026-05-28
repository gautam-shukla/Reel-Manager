'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { Trash2, RotateCcw, CheckSquare, Square, Loader2 } from 'lucide-react'

interface DeletedReel {
  id: string
  instagram_url: string
  thumbnail_url: string | null
  note: string
  deleted_at: string
  original_folder_id: string
}

export default function RecycleBinPage() {
  const { user, refreshFolders, searchQuery } = useApp()
  const supabase = createClient()

  const [reels, setReels] = useState<DeletedReel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [restoring, setRestoring] = useState(false)
  const [emptying, setEmptying] = useState(false)

  // Fetch soft-deleted reels (within 7 days)
  const fetchDeletedReels = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data, error } = await supabase
        .from('reels')
        .select('id, instagram_url, thumbnail_url, note, deleted_at, original_folder_id')
        .eq('user_id', user.id)
        .eq('is_deleted', true)
        .gte('deleted_at', sevenDaysAgo)
        .order('deleted_at', { ascending: false })

      if (!error) {
        setReels(data || [])
      }
    } catch (err) {
      console.error('Error fetching deleted reels:', err)
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  useEffect(() => {
    fetchDeletedReels()
  }, [fetchDeletedReels])

  // Toggle selection for a single reel
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReels.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredReels.map(r => r.id))
    }
  }

  // Restore single reel
  const handleRestoreSingle = async (reel: DeletedReel, e: React.MouseEvent) => {
    e.stopPropagation()
    setRestoring(true)
    try {
      const { error } = await supabase
        .from('reels')
        .update({
          is_deleted: false,
          deleted_at: null,
          folder_id: reel.original_folder_id
        })
        .eq('id', reel.id)

      if (!error) {
        setReels(reels.filter(r => r.id !== reel.id))
        setSelectedIds(selectedIds.filter(x => x !== reel.id))
        await refreshFolders()
      }
    } catch (err) {
      console.error('Error restoring reel:', err)
    } finally {
      setRestoring(false)
    }
  }

  // Restore selected reels (batch)
  const handleRestoreSelected = async () => {
    if (selectedIds.length === 0) return
    setRestoring(true)
    try {
      const reelsToRestore = reels.filter(r => selectedIds.includes(r.id))
      
      // Update each reel to restore it to its original folder
      await Promise.all(
        reelsToRestore.map((reel) =>
          supabase
            .from('reels')
            .update({
              is_deleted: false,
              deleted_at: null,
              folder_id: reel.original_folder_id
            })
            .eq('id', reel.id)
        )
      )

      setReels(reels.filter(r => !selectedIds.includes(r.id)))
      setSelectedIds([])
      await refreshFolders()
    } catch (err) {
      console.error('Error restoring batch:', err)
    } finally {
      setRestoring(false)
    }
  }

  // Empty Bin (Hard delete)
  const handleEmptyBin = async () => {
    const confirmEmpty = window.confirm('Are you sure you want to permanently delete all items in the Recycle Bin? This action cannot be undone.')
    if (!confirmEmpty || !user) return
    
    setEmptying(true)
    try {
      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('user_id', user.id)
        .eq('is_deleted', true)

      if (!error) {
        setReels([])
        setSelectedIds([])
        await refreshFolders()
      }
    } catch (err) {
      console.error('Error emptying bin:', err)
    } finally {
      setEmptying(false)
    }
  }

  // Calculate days left before permanent deletion
  const getDaysLeft = (deletedAtStr: string) => {
    const deletedAt = new Date(deletedAtStr)
    const expiryDate = new Date(deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    const diffTime = expiryDate.getTime() - new Date().getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return 'Expires soon'
    if (diffDays === 1) return '1 day left'
    return `${diffDays} days left`
  }

  // Filter deleted reels by search query
  const filteredReels = reels.filter((reel) =>
    reel.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reel.instagram_url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col p-8 bg-bg-base">
      
      {/* Page Header Row */}
      <div className="flex justify-between items-start mb-8 px-1">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Recycle Bin
          </h2>
          <p className="text-sm text-text-muted mt-1 leading-normal">
            Deleted reels are kept for 7 days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEmptyBin}
            disabled={reels.length === 0 || emptying}
            className="btn-destructive flex items-center gap-2 h-10 py-0"
          >
            {emptying ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            Empty Bin
          </button>
          <button
            onClick={handleRestoreSelected}
            disabled={selectedIds.length === 0 || restoring}
            className="btn-primary flex items-center gap-2 h-10 py-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {restoring ? <Loader2 className="animate-spin" size={14} /> : <RotateCcw size={14} />}
            Restore Selected
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-text-secondary" size={28} />
        </div>
      ) : reels.length === 0 ? (
        /* Empty Bin state */
        <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-24 px-4 bg-bg-surface text-center">
          <Trash2 className="text-text-muted mb-4 opacity-50" size={56} strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">Recycle bin is empty</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            Reels you delete from folders will appear here for 7 days before permanent cleanup.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Select All Controls */}
          <div className="flex items-center gap-2 mb-4 px-1 text-xs text-text-secondary">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 font-medium hover:text-text-primary transition-colors py-1.5"
            >
              {selectedIds.length === filteredReels.length ? (
                <CheckSquare size={16} className="text-accent" />
              ) : (
                <Square size={16} />
              )}
              Select All ({selectedIds.length} of {filteredReels.length} selected)
            </button>
          </div>

          {/* Deleted Reels Grid */}
          {filteredReels.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-20 px-4 bg-bg-surface text-center">
              <h3 className="text-lg font-semibold text-text-primary mb-1">No matches found</h3>
              <p className="text-sm text-text-secondary max-w-sm">
                No deleted reels matching &ldquo;{searchQuery}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {filteredReels.map((reel) => {
                const isSelected = selectedIds.includes(reel.id)
                return (
                  <div
                    key={reel.id}
                    onClick={() => toggleSelect(reel.id)}
                    className={`group relative rounded-xl border bg-bg-card overflow-hidden flex flex-col shadow-md cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'border-accent shadow-[0_0_0_2px_var(--accent)]' 
                        : 'border-red-500/20 hover:border-red-500/40'
                    }`}
                  >
                    {/* Checkbox Overlay (Always visible in recycle bin) */}
                    <div className="absolute top-2.5 left-2.5 z-10 w-6 h-6 flex items-center justify-center bg-black/60 rounded-md border border-white/20">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-text-primary" />
                      ) : (
                        <Square size={16} className="text-text-secondary" />
                      )}
                    </div>

                    {/* Restore Action Overlay Button */}
                    <button
                      onClick={(e) => handleRestoreSingle(reel, e)}
                      className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 hover:bg-black text-text-primary p-2 rounded-lg border border-border-default shadow-md"
                      title="Restore to folder"
                    >
                      <RotateCcw size={14} />
                    </button>

                    {/* Thumbnail */}
                    <div className="relative aspect-[9/16] w-full bg-bg-elevated overflow-hidden">
                      {reel.thumbnail_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/proxy-image?url=${encodeURIComponent(reel.thumbnail_url)}`}
                          alt="Reel thumbnail"
                          className="w-full h-full object-cover grayscale opacity-80"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted">
                          <Trash2 size={24} className="opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Footer Details */}
                    <div className="p-3.5 flex flex-col border-t border-border-subtle bg-bg-surface/20 flex-1 justify-between min-h-[80px]">
                      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-2">
                        {reel.note || <span className="italic">No note.</span>}
                      </p>
                      <span className="text-[11px] font-semibold text-red-400/90 font-mono tracking-wide">
                        ⚠️ {getDaysLeft(reel.deleted_at)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
