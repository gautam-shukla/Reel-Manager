import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from 'contexts/AppContext'
import { createClient } from 'lib/supabase/client'
import { ArrowLeft, ArrowRight, Trash2, Plus, Loader2, ExternalLink, Edit, Trash, Info } from 'lucide-react'
import useContextMenu from 'hooks/useContextMenu'
import { ROUTES } from 'constants/routes'
import { API_ENDPOINTS } from 'constants/api'
import { UI } from 'constants/ui'
import { logger } from 'utils/logger'

interface Reel {
  id: string
  instagram_url: string
  thumbnail_url: string | null
  note: string
  instagram_username?: string | null
  instagram_caption?: string | null
  created_at: string
  updated_at?: string
}

export default function Folder() {
  const params = useParams()
  const folderId = params.folderId as string
  const navigate = useNavigate()
  const { user, searchQuery, refreshFolders, folders } = useApp()
  const supabase = createClient()
  const { openMenu } = useContextMenu()

  // Data State
  const [folderName, setFolderName] = useState('Loading...')
  const [reels, setReels] = useState<Reel[]>([])
  const [subfolders, setSubfolders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog & Form States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)

  const [subfolderToDelete, setSubfolderToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeletingSubfolder, setIsDeletingSubfolder] = useState(false)

  const [isAddReelOpen, setIsAddReelOpen] = useState(false)
  const [reelUrl, setReelUrl] = useState('')
  const [reelNote, setReelNote] = useState('')
  const [reelSubmitting, setReelSubmitting] = useState(false)
  const [reelError, setReelError] = useState<string | null>(null)

  const [isAddSubfolderOpen, setIsAddSubfolderOpen] = useState(false)
  const [newSubfolderName, setNewSubfolderName] = useState('')
  const [subfolderSubmitting, setSubfolderSubmitting] = useState(false)
  const [subfolderError, setSubfolderError] = useState<string | null>(null)

  const [folderToRename, setFolderToRename] = useState<{ id: string; name: string } | null>(null)
  const [renameFolderNameValue, setRenameFolderNameValue] = useState('')
  const [isRenamingFolder, setIsRenamingFolder] = useState(false)
  const [renameFolderError, setRenameFolderError] = useState<string | null>(null)

  const [reelToEdit, setReelToEdit] = useState<{
    id: string
    note: string
    instagram_username: string | null
    instagram_caption: string | null
    thumbnail_url: string | null
  } | null>(null)
  const [editReelNoteValue, setEditReelNoteValue] = useState('')
  const [editReelUsernameValue, setEditReelUsernameValue] = useState('')
  const [editReelCaptionValue, setEditReelCaptionValue] = useState('')
  const [editReelThumbnailValue, setEditReelThumbnailValue] = useState('')
  const [isEditingReel, setIsEditingReel] = useState(false)
  const [editReelError, setEditReelError] = useState<string | null>(null)

  // Advanced Add Reel inputs
  const [addReelShowAdvanced, setAddReelShowAdvanced] = useState(false)
  const [addReelUsername, setAddReelUsername] = useState('')
  const [addReelCaption, setAddReelCaption] = useState('')
  const [addReelThumbnail, setAddReelThumbnail] = useState('')

  const [folderProperties, setFolderProperties] = useState<any | null>(null)
  const [reelProperties, setReelProperties] = useState<any | null>(null)

  // 1. Optimized Data Fetching: Parallel execution and efficient array mapping
  const fetchFolderData = useCallback(async () => {
    if (!user || !folderId) return
    setLoading(true)

    try {
      const [
        { data: folder, error: folderErr },
        { data: subfoldersData },
        { data: allReelsData },
        { data: reelsData, error: reelsErr }
      ] = await Promise.all([
        supabase.from('folders').select('name').eq('id', folderId).single(),
        supabase.from('folders').select('*').eq('parent_id', folderId).eq('is_deleted', false).order('created_at', { ascending: false }),
        supabase.from('reels').select('folder_id').eq('user_id', user.id).eq('is_deleted', false),
        supabase.from('reels').select('id, instagram_url, thumbnail_url, note, instagram_username, instagram_caption, created_at, updated_at').eq('folder_id', folderId).eq('is_deleted', false).order('created_at', { ascending: false })
      ])

      setFolderName(folderErr ? 'Folder Not Found' : folder.name)

      // Optimize counting reels per folder using a frequency map (O(N) instead of O(N*M))
      const reelCounts = (allReelsData || []).reduce((acc: Record<string, number>, r) => {
        acc[r.folder_id] = (acc[r.folder_id] || 0) + 1
        return acc
      }, {})

      const processedSubfolders = (subfoldersData || []).map(f => ({
        ...f,
        reelsCount: reelCounts[f.id] || 0
      }))

      setSubfolders(processedSubfolders)
      if (!reelsErr) setReels(reelsData || [])

    } catch (err) {
      logger.error('Error fetching folder data:', err)
    } finally {
      setLoading(false)
    }
  }, [folderId, user, supabase])

  useEffect(() => {
    fetchFolderData()
  }, [fetchFolderData])

  // 2. Memoized Derived State to prevent unnecessary re-calculations
  const filteredSubfolders = useMemo(() => {
    if (!searchQuery) return subfolders
    const lowerQuery = searchQuery.toLowerCase()
    return subfolders.filter((f) => f.name.toLowerCase().includes(lowerQuery))
  }, [subfolders, searchQuery])

  const filteredReels = useMemo(() => {
    if (!searchQuery) return reels
    const lowerQuery = searchQuery.toLowerCase()
    return reels.filter((reel) =>
      (reel.note && reel.note.toLowerCase().includes(lowerQuery)) ||
      reel.instagram_url.toLowerCase().includes(lowerQuery)
    )
  }, [reels, searchQuery])

  const breadcrumbs = useMemo(() => {
    const trail = []
    let current = folders.find(f => f.id === folderId)
    while (current) {
      trail.unshift(current)
      const parentId = current.parent_id
      current = parentId ? folders.find(f => f.id === parentId) : undefined
    }
    return trail
  }, [folders, folderId])

  // Handlers
  const handleAddReel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reelUrl.trim() || !user) return
    setReelSubmitting(true)
    setReelError(null)

    try {
      const proxyRes = await fetch(API_ENDPOINTS.THUMBNAIL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: reelUrl.trim() })
      })

      let fetchedThumbnail = null
      let fetchedUsername = null
      let fetchedCaption = null
      if (proxyRes.ok) {
        const proxyData = await proxyRes.json()
        fetchedThumbnail = proxyData.thumbnail
        fetchedUsername = proxyData.username
        fetchedCaption = proxyData.caption
      }

      const finalNote = reelNote.trim()

      const { error: dbError } = await supabase.from('reels').insert({
        user_id: user.id,
        folder_id: folderId,
        original_folder_id: folderId,
        instagram_url: reelUrl.trim(),
        thumbnail_url: addReelThumbnail.trim() || fetchedThumbnail,
        note: finalNote,
        instagram_username: addReelUsername.trim() || fetchedUsername,
        instagram_caption: addReelCaption.trim() || fetchedCaption
      })

      if (dbError) throw dbError

      setReelUrl('')
      setReelNote('')
      setAddReelUsername('')
      setAddReelCaption('')
      setAddReelThumbnail('')
      setAddReelShowAdvanced(false)
      setIsAddReelOpen(false)
      await fetchFolderData()
      await refreshFolders()
    } catch (err: any) {
      setReelError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
    } finally {
      setReelSubmitting(false)
    }
  }

  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubfolderName.trim() || !user) return
    setSubfolderSubmitting(true)
    setSubfolderError(null)

    try {
      const { error } = await supabase.from('folders').insert({
        user_id: user.id,
        name: newSubfolderName.trim(),
        parent_id: folderId
      })

      if (error) throw error

      setNewSubfolderName('')
      setIsAddSubfolderOpen(false)
      await fetchFolderData()
      await refreshFolders()
    } catch (err: any) {
      setSubfolderError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
    } finally {
      setSubfolderSubmitting(false)
    }
  }

  const handleSoftDelete = async (reelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const { error } = await supabase.from('reels').update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }).eq('id', reelId)

      if (!error) {
        setReels(prev => prev.filter(r => r.id !== reelId))
        await refreshFolders()
      }
    } catch (err) {
      logger.error('Error soft deleting reel:', err)
    }
  }

  const handleConfirmDeleteFolder = async () => {
    if (!user) return
    setIsDeletingFolder(true)

    try {
      const { error } = await supabase.from('folders').update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }).eq('id', folderId)

      if (!error) {
        await refreshFolders()
        navigate(ROUTES.DASHBOARD)
      } else {
        alert(`${UI.ERRORS.DELETE_ERROR}${error.message}`)
      }
    } catch (err) {
      logger.error('Error deleting folder:', err)
    } finally {
      setIsDeletingFolder(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleConfirmDeleteSubfolder = async () => {
    if (!subfolderToDelete) return
    setIsDeletingSubfolder(true)
    try {
      const { error } = await supabase.from('folders').update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      }).eq('id', subfolderToDelete.id)

      if (!error) {
        setSubfolders(prev => prev.filter(f => f.id !== subfolderToDelete.id))
        setSubfolderToDelete(null)
        await refreshFolders()
      } else {
        alert(`${UI.ERRORS.DELETE_SUBFOLDER_ERROR}${error.message}`)
      }
    } catch (err) {
      logger.error('Error deleting subfolder:', err)
    } finally {
      setIsDeletingSubfolder(false)
    }
  }

  const handleRenameFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!folderToRename || !renameFolderNameValue.trim()) return
    setIsRenamingFolder(true)
    setRenameFolderError(null)

    try {
      const { error } = await supabase.from('folders').update({
        name: renameFolderNameValue.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', folderToRename.id)

      if (error) throw error

      setFolderToRename(null)
      await fetchFolderData()
      await refreshFolders()
    } catch (err: any) {
      setRenameFolderError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
    } finally {
      setIsRenamingFolder(false)
    }
  }

  const handleEditReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reelToEdit) return
    setIsEditingReel(true)
    setEditReelError(null)

    try {
      const { error } = await supabase.from('reels').update({
        note: editReelNoteValue.trim(),
        instagram_username: editReelUsernameValue.trim() || null,
        instagram_caption: editReelCaptionValue.trim() || null,
        thumbnail_url: editReelThumbnailValue.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', reelToEdit.id)

      if (error) throw error

      setReelToEdit(null)
      await fetchFolderData()
    } catch (err: any) {
      setEditReelError(err.message || UI.ERRORS.SOMETHING_WENT_WRONG)
    } finally {
      setIsEditingReel(false)
    }
  }

  const handleShowFolderProperties = async (folder: any) => {
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

  const handleShowReelProperties = (reel: any) => {
    setReelProperties({
      instagram_url: reel.instagram_url,
      note: reel.note,
      created_at: reel.created_at,
      updated_at: reel.updated_at || reel.created_at
    })
  }

  const handleFolderContextMenu = useCallback((e: React.MouseEvent, folder: any) => {
    openMenu(e, [
      { label: UI.BUTTONS.RENAME, icon: <Edit size={14} />, onClick: () => { setFolderToRename({ id: folder.id, name: folder.name }); setRenameFolderNameValue(folder.name); setRenameFolderError(null) } },
      { label: UI.BUTTONS.DELETE, icon: <Trash size={14} />, isDanger: true, onClick: () => setSubfolderToDelete({ id: folder.id, name: folder.name }) },
      { label: UI.BUTTONS.PROPERTIES, icon: <Info size={14} />, isSeparatorBefore: true, onClick: () => handleShowFolderProperties(folder) }
    ])
  }, [openMenu])

  const handleReelContextMenu = useCallback((e: React.MouseEvent, reel: any) => {
    openMenu(e, [
      { label: 'Edit Details', icon: <Edit size={14} />, onClick: () => {
        setReelToEdit({
          id: reel.id,
          note: reel.note || '',
          instagram_username: reel.instagram_username || null,
          instagram_caption: reel.instagram_caption || null,
          thumbnail_url: reel.thumbnail_url || null
        })
        setEditReelNoteValue(reel.note || '')
        setEditReelUsernameValue(reel.instagram_username || '')
        setEditReelCaptionValue(reel.instagram_caption || '')
        setEditReelThumbnailValue(reel.thumbnail_url || '')
        setEditReelError(null)
      } },
      { label: UI.BUTTONS.DELETE, icon: <Trash size={14} />, isDanger: true, onClick: () => handleSoftDelete(reel.id) },
      { label: UI.BUTTONS.PROPERTIES, icon: <Info size={14} />, isSeparatorBefore: true, onClick: () => handleShowReelProperties(reel) }
    ])
  }, [openMenu])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-base relative">
      {/* Breadcrumbs & Navigation Buttons */}
      <div className="flex justify-between items-center px-8 py-4 border-b border-border-subtle bg-bg-surface/30">
        <div className="flex items-center gap-1 text-xs text-text-muted select-none">
          <button onClick={() => navigate(ROUTES.DASHBOARD)} className="hover:text-text-primary transition-colors cursor-pointer bg-transparent border-none">
            {UI.LABELS.DASHBOARD}
          </button>
          {breadcrumbs.map((b, index) => (
            <span key={b.id} className="flex items-center gap-1">
              <span className="mx-1">/</span>
              <button
                onClick={() => navigate(`/folder/${b.id}`)}
                className={`hover:text-text-primary transition-colors truncate max-w-[120px] cursor-pointer bg-transparent border-none ${index === breadcrumbs.length - 1 ? 'text-text-secondary font-medium' : ''}`}
                disabled={index === breadcrumbs.length - 1}
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 select-none">
          <button onClick={() => navigate(-1)} className="btn-icon w-8 h-8 cursor-pointer" title={UI.BUTTONS.GO_BACK}>
            <ArrowLeft size={14} />
          </button>
          <button onClick={() => navigate(1)} className="btn-icon w-8 h-8 cursor-pointer" title={UI.BUTTONS.GO_FORWARD}>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary truncate pr-4 pb-1 max-w-[60%]">
            {folderName}
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDeleteConfirm(true)} className="btn-destructive flex items-center gap-2 h-10 py-0 cursor-pointer">
              <Trash2 size={14} /> {UI.BUTTONS.DELETE}
            </button>
            <button onClick={() => setIsAddSubfolderOpen(true)} className="btn-ghost flex items-center gap-2 h-10 cursor-pointer">
              <Plus size={14} /> {UI.BUTTONS.CREATE_SUBFOLDER}
            </button>
            <button onClick={() => setIsAddReelOpen(true)} className="btn-primary flex items-center gap-2 h-10 cursor-pointer">
              <Plus size={16} /> {UI.BUTTONS.ADD_REEL}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-text-secondary" size={28} />
          </div>
        ) : subfolders.length === 0 && reels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-default rounded-xl py-15 px-4 bg-bg-surface text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-1">{UI.LABELS.THIS_FOLDER_EMPTY}</h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm">{UI.LABELS.THIS_FOLDER_EMPTY_DESC}</p>
            <div className="flex gap-3">
              <button onClick={() => setIsAddSubfolderOpen(true)} className="btn-ghost cursor-pointer">{UI.BUTTONS.CREATE_SUBFOLDER_BTN}</button>
              <button onClick={() => setIsAddReelOpen(true)} className="btn-primary cursor-pointer">{UI.BUTTONS.ADD_FIRST_REEL}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Subfolders Section */}
            {filteredSubfolders.length > 0 && (
              <div>
                <h3 className="text-[10px] font-mono tracking-widest text-text-muted uppercase mb-4 select-none">
                  {UI.LABELS.SUBFOLDERS} ({filteredSubfolders.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredSubfolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => navigate(`/folder/${folder.id}`)}
                      onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                      className="group cursor-pointer rounded-xl border border-border-default bg-bg-card overflow-hidden hover:border-text-secondary hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all flex flex-col"
                    >
                      <div className="relative h-[60px] bg-bg-elevated flex items-center justify-center border-b border-border-subtle group-hover:bg-border-default transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary group-hover:text-text-primary transition-colors">
                          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                        </svg>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSubfolderToDelete({ id: folder.id, name: folder.name }) }}
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
              </div>
            )}

            {/* Reels Section */}
            <div>
              <h3 className="text-[10px] font-mono tracking-widest text-text-muted uppercase mb-4 mt-6 select-none">
                {UI.LABELS.REELS} ({filteredReels.length})
              </h3>

              {filteredReels.length === 0 ? (
                <div className="border border-dashed border-border-default rounded-xl py-12 px-4 bg-bg-surface text-center">
                  <p className="text-sm text-text-muted">{UI.LABELS.NO_REELS_MATCH}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                  {filteredReels.map((reel) => (
                    <div
                      key={reel.id}
                      onContextMenu={(e) => handleReelContextMenu(e, reel)}
                      className="group relative rounded-xl border border-border-default bg-bg-card overflow-hidden flex flex-col shadow-[0_1px_3px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.08)]"
                    >
                      <div
                        onClick={() => window.open(reel.instagram_url, '_blank')}
                        className="relative aspect-[9/16] w-full bg-gradient-to-b from-[#1a1a1a] to-[#2a2a2a] cursor-pointer overflow-hidden group-hover:opacity-95 transition-all"
                      >
                        {reel.thumbnail_url && !reel.thumbnail_url.includes('images.unsplash.com') ? (
                          <img
                            src={reel.thumbnail_url.includes('cdninstagram.com') || reel.thumbnail_url.includes('fbcdn.net')
                              ? `${API_ENDPOINTS.PROXY_IMAGE}?url=${encodeURIComponent(reel.thumbnail_url)}`
                              : reel.thumbnail_url}
                            alt="Reel thumbnail"
                            className="w-full h-full object-cover rounded-t-[10px] group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#161616] to-[#0A0A0A] text-center select-none relative group/mock">
                            <span className="text-[10px] font-mono tracking-[0.2em] text-text-muted uppercase mt-2">{UI.LABELS.INSTAGRAM_REEL}</span>
                            <div className="w-14 h-14 rounded-full bg-[#111] border border-border-default flex items-center justify-center text-text-secondary group-hover:text-text-primary group-hover:border-text-secondary transition-all">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                            <div className="mb-2 text-[11px] font-mono text-text-muted flex items-center gap-1.5 justify-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                              {UI.LABELS.INSTAGRAM_COM}
                            </div>
                          </div>
                        )}

                        {/* Bottom shadow gradient for username text readability */}
                        <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/75 to-transparent pointer-events-none z-10" />

                        {/* Instagram logo and username overlay with placeholder fallback */}
                        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 text-xs text-white font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] select-none pointer-events-none">
                          <div className="w-5 h-5 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                          </div>
                          <span className={reel.instagram_username ? "" : "text-white/40 italic font-normal"}>
                            @{reel.instagram_username || 'username'}
                          </span>
                        </div>

                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                          <div className="w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white"><ExternalLink size={16} /></div>
                        </div>
                        <button
                          onClick={(e) => handleSoftDelete(reel.id, e)}
                          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 hover:bg-black text-destructive p-2 rounded-lg border border-border-default shadow-md cursor-pointer"
                          title={UI.BUTTONS.DELETE}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="p-3.5 flex flex-col border-t border-border-subtle bg-bg-surface/20 min-h-[85px] justify-between">
                        <p className={`text-[11px] line-clamp-2 leading-relaxed break-words mb-2 italic ${reel.instagram_caption ? 'text-text-secondary' : 'text-text-muted select-none'}`} title={reel.instagram_caption || 'No caption available.'}>
                          "{reel.instagram_caption || 'No caption available.'}"
                        </p>
                        <p
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setReelToEdit({
                              id: reel.id,
                              note: reel.note || '',
                              instagram_username: reel.instagram_username || null,
                              instagram_caption: reel.instagram_caption || null,
                              thumbnail_url: reel.thumbnail_url || null
                            })
                            setEditReelNoteValue(reel.note || '')
                            setEditReelUsernameValue(reel.instagram_username || '')
                            setEditReelCaptionValue(reel.instagram_caption || '')
                            setEditReelThumbnailValue(reel.thumbnail_url || '')
                            setEditReelError(null)
                          }}
                          className="text-xs text-text-primary font-semibold line-clamp-2 leading-relaxed break-words cursor-pointer select-none"
                        >
                          {reel.note || <span className="text-text-muted font-normal italic">{UI.PLACEHOLDERS.DOUBLE_CLICK_EDIT}</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals - Condensed layout */}
      {isAddSubfolderOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">{UI.TITLES.NEW_SUBFOLDER}</h3>
            <form onSubmit={handleCreateSubfolder} className="space-y-6">
              {subfolderError && <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">{subfolderError}</div>}
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">{UI.LABELS.SUBFOLDER_NAME}</label>
                <input type="text" placeholder={UI.PLACEHOLDERS.SUBFOLDER_NAME_EXP} value={newSubfolderName} onChange={(e) => setNewSubfolderName(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none" required autoFocus />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsAddSubfolderOpen(false); setNewSubfolderName(''); setSubfolderError(null) }} className="btn-ghost" disabled={subfolderSubmitting}>{UI.BUTTONS.CANCEL}</button>
                <button type="submit" className="btn-primary" disabled={subfolderSubmitting}>{subfolderSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : UI.BUTTONS.CREATE_SUBFOLDER}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddReelOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[480px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">{UI.TITLES.ADD_REEL}</h3>
            <form onSubmit={handleAddReel} className="space-y-6">
              {reelError && <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">{reelError}</div>}
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">{UI.LABELS.REEL_URL}</label>
                <input type="url" placeholder={UI.PLACEHOLDERS.REEL_URL_EXP} value={reelUrl} onChange={(e) => setReelUrl(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none" required autoFocus />
              </div>
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">{UI.LABELS.YOUR_NOTE}</label>
                <textarea placeholder={UI.PLACEHOLDERS.REEL_NOTE_EXP} value={reelNote} onChange={(e) => setReelNote(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none resize-none" rows={3} />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setAddReelShowAdvanced(!addReelShowAdvanced)}
                  className="text-xs font-mono text-accent hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 focus:outline-none select-none"
                >
                  {addReelShowAdvanced ? '[-]' : '[+]'} Add details manually (if scraper fails)
                </button>
              </div>
              {addReelShowAdvanced && (
                <div className="space-y-4 border-t border-border-subtle pt-4 mt-2">
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">Instagram Username</label>
                    <input
                      type="text"
                      placeholder="e.g. instagram_user"
                      value={addReelUsername}
                      onChange={(e) => setAddReelUsername(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">Reel Caption</label>
                    <textarea
                      placeholder="e.g. This is an awesome recipe..."
                      value={addReelCaption}
                      onChange={(e) => setAddReelCaption(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">Custom Thumbnail Image URL</label>
                    <input
                      type="url"
                      placeholder="e.g. https://images.unsplash.com/..."
                      value={addReelThumbnail}
                      onChange={(e) => setAddReelThumbnail(e.target.value)}
                      className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsAddReelOpen(false); setReelUrl(''); setReelNote(''); setAddReelUsername(''); setAddReelCaption(''); setAddReelThumbnail(''); setAddReelShowAdvanced(false); setReelError(null) }} className="btn-ghost" disabled={reelSubmitting}>{UI.BUTTONS.CANCEL}</button>
                <button type="submit" className="btn-primary" disabled={reelSubmitting}>{reelSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : UI.BUTTONS.SAVE_REEL}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {subfolderToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-5"><Trash2 size={20} /></div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{UI.TITLES.DELETE_SUBFOLDER}</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">Are you sure you want to move the subfolder <span className="text-text-primary font-semibold font-mono bg-bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">&ldquo;{subfolderToDelete.name}&rdquo;</span> to the Recycle Bin?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setSubfolderToDelete(null)} className="btn-ghost px-5 py-2.5 h-[40px] text-xs font-semibold cursor-pointer" disabled={isDeletingSubfolder}>{UI.BUTTONS.CANCEL}</button>
              <button onClick={handleConfirmDeleteSubfolder} className="btn-destructive px-5 py-2.5 h-[40px] text-xs font-semibold !bg-red-500 !text-white hover:!bg-red-600 border-none flex items-center justify-center gap-2 cursor-pointer" disabled={isDeletingSubfolder}>{isDeletingSubfolder ? UI.BUTTONS.DELETING : UI.BUTTONS.MOVE_TO_BIN}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-5"><Trash2 size={20} /></div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{UI.TITLES.DELETE_FOLDER}</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">Are you sure you want to move the folder <span className="text-text-primary font-semibold font-mono bg-bg-elevated px-1.5 py-0.5 rounded border border-border-subtle">&ldquo;{folderName}&rdquo;</span> to the Recycle Bin?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost px-5 py-2.5 h-[40px] text-xs font-semibold cursor-pointer" disabled={isDeletingFolder}>{UI.BUTTONS.CANCEL}</button>
              <button onClick={handleConfirmDeleteFolder} className="btn-destructive px-5 py-2.5 h-[40px] text-xs font-semibold !bg-red-500 !text-white hover:!bg-red-600 border-none flex items-center justify-center gap-2 cursor-pointer" disabled={isDeletingFolder}>{isDeletingFolder ? UI.BUTTONS.DELETING : UI.BUTTONS.MOVE_TO_BIN}</button>
            </div>
          </div>
        </div>
      )}

      {folderToRename && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[400px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6">{UI.TITLES.RENAME_FOLDER}</h3>
            <form onSubmit={handleRenameFolderSubmit} className="space-y-6">
              {renameFolderError && <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">{renameFolderError}</div>}
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">{UI.LABELS.FOLDER_NAME}</label>
                <input type="text" value={renameFolderNameValue} onChange={(e) => setRenameFolderNameValue(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none" required autoFocus />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setFolderToRename(null)} className="btn-ghost" disabled={isRenamingFolder}>{UI.BUTTONS.CANCEL}</button>
                <button type="submit" className="btn-primary" disabled={isRenamingFolder}>{isRenamingFolder ? UI.BUTTONS.RENAMING : UI.BUTTONS.RENAME}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reelToEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[480px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-text-primary mb-6">Edit Reel Details</h3>
            <form onSubmit={handleEditReelSubmit} className="space-y-6">
              {editReelError && <div className="p-3 text-xs border border-destructive/20 bg-destructive/10 text-destructive rounded-md">{editReelError}</div>}
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">{UI.LABELS.NOTE}</label>
                <textarea value={editReelNoteValue} onChange={(e) => setEditReelNoteValue(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none resize-none" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">Instagram Username</label>
                <input type="text" value={editReelUsernameValue} onChange={(e) => setEditReelUsernameValue(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none" placeholder="e.g. instagram_user" />
              </div>
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">Instagram Caption</label>
                <textarea value={editReelCaptionValue} onChange={(e) => setEditReelCaptionValue(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none resize-none" rows={3} placeholder="e.g. Reel caption..." />
              </div>
              <div>
                <label className="block text-xs font-mono tracking-widest text-text-muted uppercase mb-2">Thumbnail Image URL</label>
                <input type="url" value={editReelThumbnailValue} onChange={(e) => setEditReelThumbnailValue(e.target.value)} className="w-full bg-bg-elevated border border-border-default text-text-primary rounded-md py-2.5 px-3.5 text-sm focus:border-accent focus:outline-none" placeholder="e.g. https://images.unsplash.com/..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setReelToEdit(null)} className="btn-ghost" disabled={isEditingReel}>{UI.BUTTONS.CANCEL}</button>
                <button type="submit" className="btn-primary" disabled={isEditingReel}>{isEditingReel ? UI.BUTTONS.SAVING : UI.BUTTONS.SAVE}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {reelProperties && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay backdrop-blur-md">
          <div className="w-full max-w-[460px] bg-bg-card border border-border-default rounded-xl p-8 shadow-2xl mx-4">
            <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2 select-none">{UI.TITLES.REEL_PROPERTIES}</h3>
            <div className="space-y-5">
              <div className="flex flex-col gap-1 border-b border-border-subtle pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.INSTAGRAM_URL}</span>
                <a href={reelProperties.instagram_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-accent hover:underline truncate">{reelProperties.instagram_url}</a>
              </div>
              <div className="flex flex-col gap-1 border-b border-border-subtle pb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.NOTE}</span>
                <span className="text-xs text-text-secondary leading-relaxed max-h-[80px] overflow-y-auto break-words">{reelProperties.note || <span className="italic text-text-muted">{UI.LABELS.NO_NOTE}</span>}</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-3"><span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.DATE_ADDED}</span><span className="text-sm font-medium text-text-secondary">{formatDate(reelProperties.created_at)}</span></div>
              <div className="flex justify-between border-b border-border-subtle pb-3"><span className="text-xs font-mono uppercase tracking-wider text-text-muted">{UI.LABELS.LAST_MODIFIED}</span><span className="text-sm font-medium text-text-secondary">{formatDate(reelProperties.updated_at)}</span></div>
              <div className="flex justify-end pt-4"><button type="button" onClick={() => setReelProperties(null)} className="btn-primary px-6 cursor-pointer">{UI.BUTTONS.CLOSE}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}