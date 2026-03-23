-- Create the warranties table
CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    image_path TEXT NOT NULL,
    extraction_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows users to see only their own data
CREATE POLICY "Users can only access their own warranties" ON public.warranties
    FOR ALL
    USING (auth.uid()::text = user_id);
