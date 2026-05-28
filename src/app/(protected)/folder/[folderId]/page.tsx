'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Trash2, Plus, Loader2, Camera, ExternalLink } from 'lucide-react'

interface Reel {
  id: string
  instagram_url: string
  thumbnail_url: string | null
  note: string
  created_at: string
}

export default function FolderPage() {
  const params = useParams()
  const folderId = params.folderId as string
  const router = useRouter()
  const { user, searchQuery, refreshFolders } = useApp()
  const supabase = createClient()

  const [folderName, setFolderName] = useState('Loading...')
  const [reels, setReels] = useState<Reel[]>([])
  const [loading, setLoading] = useState(true)

  // Add Reel Dialog State
  const [isAddReelOpen, setIsAddReelOpen] = useState(false)
  const [reelUrl, setReelUrl] = useState('')
  const [reelNote, setReelNote] = useState('')
  const [reelSubmitting, setReelSubmitting] = useState(false)
  const [reelError, setReelError] = useState<string | null>(null)

  // Inline Note Editing State
  const [editingReelId, setEditingReelId] = useState<string | null>(null)
  const [editNoteValue, setEditNoteValue] = useState('')
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null)

  // Fetch folder info and reels
  const fetchFolderData = useCallback(async () => {
    if (!user || !folderId) return
    setLoading(true)
    try {
      // 1. Fetch folder name
      const { data: folder, error: folderErr } = await supabase
        .from('folders')
        .select('name')
        .eq('id', folderId)
        .single()

      if (folderErr) {
        setFolderName('Folder Not Found')
      } else {
        setFolderName(folder.name)
      }

      // 2. Fetch reels (excluding deleted)
      const { data: reelsData, error: reelsErr } = await supabase
        .from('reels')
        .select('id, instagram_url, thumbnail_url, note, created_at')
        .eq('folder_id', folderId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (!reelsErr) {
        setReels(reelsData || [])
      }
    } catch (err) {
      console.error('Error fetching folder data:', err)
    } finally {
      setLoading(false)
    }
  }, [folderId, user, supabase])

  useEffect(() => {
    fetchFolderData()
  }, [fetchFolderData])

  // Handle Add Reel submission
  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reelUrl.trim() || !user) return
    setReelSubmitting(true)
    setReelError(null)

    try {
      // 1. Call proxy endpoint to fetch thumbnail URL
      const proxyRes = await fetch('/api/thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: reelUrl.trim() })
      })
      
      let fetchedThumbnail = null
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json()
        fetchedThumbnail = proxyData.thumbnail
      }

      // 2. Insert to Supabase DB
      const { error: dbError } = await supabase
        .from('reels')
        .insert({
          user_id: user.id,
          folder_id: folderId,
          original_folder_id: folderId,
          instagram_url: reelUrl.trim(),
          thumbnail_url: fetchedThumbnail,
          note: reelNote.trim()
        })

      if (dbError) {
        setReelError(dbError.message)
      } else {
        // Success
        setReelUrl('')
        setReelNote('')
        setIsAddReelOpen(false)
        await fetchFolderData()
        await refreshFolders() // Refresh folder counts in sidebar
      }
    } catch (err: any) {
      setReelError(err.message || 'Something went wrong')
    } finally {
      setReelSubmitting(false)
    }
  }

  // Handle Soft Delete
  const handleSoftDelete = async (reelId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering card clicks (like Instagram open)
    try {
      const { error } = await supabase
        .from('reels')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', reelId)

      if (!error) {
        setReels(reels.filter(r => r.id !== reelId))
        await refreshFolders() // Refresh folder counts in sidebar
      }
    } catch (err) {
      console.error('Error soft deleting reel:', err)
    }
  }

  // Handle Note Inline Save
  const handleSaveNote = async (reelId: string) => {
    if (savingNoteId) return
    setSavingNoteId(reelId)
    try {
      const { error } = await supabase
        .from('reels')
        .update({ note: editNoteValue.trim() })
        .eq('id', reelId)

      if (!error) {
        setReels(reels.map(r => r.id === reelId ? { ...r, note: editNoteValue.trim() } : r))
        setEditingReelId(null)
      }
    } catch (err) {
      console.error('Error updating note:', err)
    } finally {
      setSavingNoteId(null)
    }
  }

  // Filter reels by search query
  const filteredReels = reels.filter((reel) =>
    reel.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reel.instagram_url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col bg-bg-base relative">
      
      {/* Breadcrumbs & Navigation Buttons */}
      <div className="flex justify-between items-center px-8 py-4 border-b border-border-subtle bg-bg-surface/30">
        <div className="text-xs text-text-muted select-none">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="hover:text-text-primary transition-colors"
          >
            Dashboard
          </button>
          <span className="mx-2">/</span>
          <span className="text-text-secondary font-medium truncate max-w-[200px] inline-block align-bottom">{folderName}</span>
        </div>

        {/* Back / Forward Controls */}
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => router.back()} 
            className="btn-icon w-8 h-8"
            title="Go Back"
          >
            <ArrowLeft size={14} />
          </button>
          <button 
            onClick={() => router.forward()} 
            className="btn-icon w-8 h-8"
            title="Go Forward"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col p-8">
        
        {/* Title row */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary truncate pr-4 max-w-[60%]">
            {folderName}
          </h2>
          <button
            onClick={() => setIsAddReelOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Add Reel
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-text-secondary" size={28} />
          </div>
        ) : reels.length === 0 ? (
          /* Empty Folder State */
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-default rounded-xl py-20 px-4 bg-bg-surface text-center">
            <Camera className="text-text-muted mb-4" size={48} strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-text-primary mb-1">No reels yet</h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm">
              Save Instagram Reels here to view them as flashcards and annotate them.
            </p>
            <button
              onClick={() => setIsAddReelOpen(true)}
              className="btn-ghost"
            >
              Add your first reel
            </button>
          </div>
        ) : filteredReels.length === 0 ? (
          /* Search Empty State */
          <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-20 px-4 bg-bg-surface text-center">
            <Camera className="text-text-muted mb-4" size={48} strokeWidth={1.5} />
            <h3 className="text-lg font-semibold text-text-primary mb-1">No matches found</h3>
            <p className="text-sm text-text-secondary max-w-sm">
              Try adjusting your search query or clear the search bar.
            </p>
          </div>
        ) : (
          /* Reels Flashcard Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {filteredReels.map((reel) => (
              <div
                key={reel.id}
                className="group relative rounded-xl border border-border-default bg-bg-card overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]"
              >
                {/* Aspect ratio 9:16 for vertical thumbnail preview */}
                <div 
                  onClick={() => window.open(reel.instagram_url, '_blank')}
                  className="relative aspect-[9/16] w-full bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] cursor-pointer overflow-hidden group-hover:opacity-95 transition-all"
                >
                  {reel.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={reel.thumbnail_url}
                      alt="Reel thumbnail"
                      className="w-full h-full object-cover rounded-t-[10px] group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary p-4 text-center">
                      <Camera size={28} className="mb-2 opacity-50" />
                      <span className="text-xs">No preview available</span>
                    </div>
                  )}

                  {/* Hover indicator link overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white">
                      <ExternalLink size={16} />
                    </div>
                  </div>

                  {/* Dustbin Soft Delete Button - visible only on card hover */}
                  <button
                    onClick={(e) => handleSoftDelete(reel.id, e)}
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 hover:bg-black text-destructive p-2 rounded-lg border border-border-default shadow-md"
                    title="Move to Recycle Bin"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Comment / Note footer section */}
                <div className="p-3.5 flex flex-col border-t border-border-subtle bg-bg-surface/20 min-h-[70px]">
                  {editingReelId === reel.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editNoteValue}
                        onChange={(e) => setEditNoteValue(e.target.value)}
                        onBlur={() => handleSaveNote(reel.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleSaveNote(reel.id)
                          }
                        }}
                        className="w-full text-xs bg-bg-elevated border border-border-default text-text-primary rounded p-1.5 focus:border-accent focus:outline-none resize-none"
                        rows={2}
                        autoFocus
                        disabled={savingNoteId === reel.id}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEditingReelId(null)}
                          className="text-[10px] text-text-muted hover:text-text-secondary"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveNote(reel.id)}
                          className="text-[10px] text-accent font-semibold"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onDoubleClick={() => {
                        setEditingReelId(reel.id)
                        setEditNoteValue(reel.note)
                      }}
                      className="cursor-pointer group/note"
                      title="Double click to edit note"
                    >
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed break-words">
                        {reel.note || <span className="text-text-muted italic">Double-click to add a note...</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Reel Dialog Modal */}
      {isAddReelOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md transition-opacity duration-200">
          <div className="w-full max-w-[480px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">Add a Reel</h3>
            
            <form onSubmit={handleAddReel} className="space-y-6">
              {reelError && (
                <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">
                  {reelError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  Instagram Reel URL
                </label>
                <input
                  type="url"
                  placeholder="https://www.instagram.com/reel/..."
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">
                  Your Note
                </label>
                <textarea
                  placeholder="Add a comment or label for this reel..."
                  value={reelNote}
                  onChange={(e) => setReelNote(e.target.value)}
                  className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/10 transition-colors placeholder:text-text-muted resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddReelOpen(false)
                    setReelUrl('')
                    setReelNote('')
                    setReelError(null)
                  }}
                  className="btn-ghost"
                  disabled={reelSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={reelSubmitting}
                >
                  {reelSubmitting ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : (
                    'Save Reel'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
