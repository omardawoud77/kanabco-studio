-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ahlbndgchsqjjzyxflhr/sql/new
--
-- Hygiene cleanup: the Drive integration was removed after we discovered
-- service accounts can't own files on personal Drive accounts
-- (storageQuotaExceeded). Library entries no longer carry Drive linkage.

ALTER TABLE library_entries DROP COLUMN IF EXISTS drive_file_id;
ALTER TABLE library_entries DROP COLUMN IF EXISTS drive_view_link;
