
-- 1. Create the user mappings table (Idempotent)
CREATE TABLE IF NOT EXISTS public.user_mappings (
    firebase_uid TEXT PRIMARY KEY,
    supabase_id UUID REFERENCES auth.users(id) NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure photo_url exists if table was created earlier without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_mappings' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE public.user_mappings ADD COLUMN photo_url TEXT;
    END IF;
END $$;

-- 2. Enable RLS (Idempotent)
ALTER TABLE public.user_mappings ENABLE ROW LEVEL SECURITY;

-- 3. Policy for the mapping table (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_mappings' AND policyname = 'Service Role Only'
    ) THEN
        CREATE POLICY "Service Role Only" ON public.user_mappings
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
END
$$;

-- 4. Storage Policies (Idempotent using DROP for clean setup)
-- Note: Replace 'warranties' if your bucket name is different

-- Drop existing if conflict occurred
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own folder" ON storage.objects;

-- Create Upload Policy
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'warranties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create Update Policy (Required for UPSERT)
CREATE POLICY "Users can update their own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'warranties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create Delete Policy
CREATE POLICY "Users can delete from their own folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'warranties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create View Policy
CREATE POLICY "Users can view their own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'warranties' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
