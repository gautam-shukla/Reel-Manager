'use client'

import { useApp } from '@/context/AppContext'
import { useRouter } from 'next/navigation'
import { FolderPlus, FolderOpen, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const { folders, searchQuery, setIsAddFolderOpen, refreshFolders } = useApp()
  const router = useRouter()
  const supabase = createClient()

  // Handle Delete Folder from Card
  const handleDeleteFolderCard = async (folderId: string, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent navigating to the folder view
    const confirmDelete = window.confirm(`Are you sure you want to delete the folder "${folderName}" and all the reels inside it? This action cannot be undone.`)
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)

      if (!error) {
        await refreshFolders()
      } else {
        alert(`Error deleting folder: ${error.message}`)
      }
    } catch (err) {
      console.error('Error deleting folder:', err)
    }
  }

  // Filter folders based on search query
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col p-8 bg-bg-base">
      
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          My Folders
        </h2>
      </div>

      {/* Folders Grid */}
      {folders.length === 0 ? (
        /* Empty State (No Folders at all) */
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border-default rounded-xl py-24 px-4 bg-bg-surface text-center">
          <FolderPlus className="text-text-muted mb-4" size={56} strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">No folders yet</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-sm">
            Create your first folder to start saving and organizing your Instagram Reels.
          </p>
          <button
            onClick={() => setIsAddFolderOpen(true)}
            className="btn-primary"
          >
            Create folder
          </button>
        </div>
      ) : filteredFolders.length === 0 ? (
        /* Search Query Empty State */
        <div className="flex-1 flex flex-col items-center justify-center border border-border-default rounded-xl py-24 px-4 bg-bg-surface text-center">
          <FolderOpen className="text-text-muted mb-4" size={56} strokeWidth={1.5} />
          <h3 className="text-lg font-semibold text-text-primary mb-1">No folders match</h3>
          <p className="text-sm text-text-secondary max-w-sm">
            No folders found matching &ldquo;{searchQuery}&rdquo;. Try another search term.
          </p>
        </div>
      ) : (
        /* Folders List Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => router.push(`/folder/${folder.id}`)}
              className="group cursor-pointer rounded-xl border border-border-default bg-bg-card overflow-hidden hover:border-text-secondary hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all flex flex-col"
            >
              {/* Folder Icon Header Area */}
              <div className="relative h-[60px] bg-bg-elevated flex items-center justify-center border-b border-border-subtle group-hover:bg-border-default transition-colors">
                <FolderIcon />
                
                {/* Hover Delete Button */}
                <button
                  onClick={(e) => handleDeleteFolderCard(folder.id, folder.name, e)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-bg-surface hover:bg-destructive hover:text-white border border-border-default text-text-muted hover:border-destructive shadow-sm"
                  title="Delete Folder"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              
              {/* Folder Details */}
              <div className="p-3.5 flex flex-col justify-between flex-1">
                <p className="text-sm font-semibold text-text-primary group-hover:text-accent truncate" title={folder.name}>
                  {folder.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {folder.reelsCount} {folder.reelsCount === 1 ? 'reel' : 'reels'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FolderIcon() {
  return (
    <svg 
      width="28" 
      height="28" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className="text-text-secondary group-hover:text-text-primary transition-colors"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
    </svg>
  )
}
