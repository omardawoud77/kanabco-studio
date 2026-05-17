-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ahlbndgchsqjjzyxflhr/sql/new

-- Adds Google Drive linkage to saved library entries.
-- (Codebase uses `library_entries`; the original spec referred to a non-existent
-- `generations` table, so the columns live on the real table.)
ALTER TABLE library_entries ADD COLUMN IF NOT EXISTS drive_file_id TEXT;
ALTER TABLE library_entries ADD COLUMN IF NOT EXISTS drive_view_link TEXT;
