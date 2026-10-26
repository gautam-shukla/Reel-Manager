-- Migration to update Reel Manager database schema
-- Run this in your Supabase SQL Editor:

-- 1. Add columns to folders table for subfolders and soft delete
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add updated_at to reels table
ALTER TABLE public.reels
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS instagram_caption TEXT;

-- 3. Set default values for existing records
UPDATE public.folders SET is_deleted = FALSE WHERE is_deleted IS NULL;
UPDATE public.folders SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE public.reels SET updated_at = created_at WHERE updated_at IS NULL;
