-- 1. Update user_projects table to support community features
-- Check if columns exist before adding them to avoid errors if partially applied
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_projects' AND column_name='is_public') THEN
        ALTER TABLE public.user_projects ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_projects' AND column_name='build_story') THEN
        ALTER TABLE public.user_projects ADD COLUMN build_story TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_projects' AND column_name='image_url') THEN
        ALTER TABLE public.user_projects ADD COLUMN image_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_projects' AND column_name='author_name') THEN
        ALTER TABLE public.user_projects ADD COLUMN author_name TEXT;
    END IF;
END $$;

-- 2. Create community_likes table
CREATE TABLE IF NOT EXISTS public.community_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.user_projects(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT NOT NULL, -- Firebase UID or Supabase UID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 3. Create community_comments table
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.user_projects(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT,
    comment_text TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add column if table already existed without it
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='community_comments' AND column_name='is_anonymous') THEN
        ALTER TABLE public.community_comments ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- LIKES: Anyone can see likes, only owner can delete, authenticated can insert
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_likes' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON public.community_likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_likes' AND policyname = 'Authenticated insert') THEN
        CREATE POLICY "Authenticated insert" ON public.community_likes FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_likes' AND policyname = 'User can delete own like') THEN
        CREATE POLICY "User can delete own like" ON public.community_likes FOR DELETE TO authenticated USING (user_id = auth.uid()::text);
    END IF;
END $$;

-- COMMENTS: Anyone can see comments, authenticated can insert, owner can delete
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'Public Access') THEN
        CREATE POLICY "Public Access" ON public.community_comments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'community_comments' AND policyname = 'Authenticated insert') THEN
        CREATE POLICY "Authenticated insert" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;
