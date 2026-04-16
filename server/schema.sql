-- INVIO Database Schema for Supabase
-- Run this in Supabase SQL Editor after creating a new project

-- 1. Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  content JSONB DEFAULT '{}'::jsonb,
  interactions JSONB DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_slug UNIQUE(user_id, slug)
);

-- 3. Create RSVP responses table
CREATE TABLE rsvp_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES invitations(id) ON DELETE CASCADE NOT NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT,
  rsvp_status TEXT CHECK (rsvp_status IN ('attending', 'not_attending', 'maybe')),
  dietary_requirements TEXT,
  additional_guests INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX idx_invitations_user_id ON invitations(user_id);
CREATE INDEX idx_invitations_slug ON invitations(slug);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_rsvp_responses_invitation_id ON rsvp_responses(invitation_id);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 7. RLS Policies for invitations
CREATE POLICY "Users can view their own draft invitations"
  ON invitations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own invitations"
  ON invitations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invitations"
  ON invitations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invitations"
  ON invitations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view published invitations by slug"
  ON invitations FOR SELECT
  USING (status = 'published');

-- 8. RLS Policies for RSVP responses
CREATE POLICY "Anyone can submit RSVP to published invitations"
  ON rsvp_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invitations 
      WHERE invitations.id = rsvp_responses.invitation_id 
      AND invitations.status = 'published'
    )
  );

CREATE POLICY "Users can view RSVP responses for their invitations"
  ON rsvp_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invitations 
      WHERE invitations.id = rsvp_responses.invitation_id 
      AND invitations.user_id = auth.uid()
    )
  );

-- 9. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rsvp_responses_updated_at BEFORE UPDATE ON rsvp_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Create a function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (new.id, new.email, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 12. Trigger to create profile on auth user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Create Storage Bucket for Media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invitation_media', 'invitation_media', true)
ON CONFLICT (id) DO NOTHING;

-- 14. Storage Policies
-- Allow public access to read files
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'invitation_media');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invitation_media' AND 
  auth.role() = 'authenticated'
);

-- Allow users to update/delete their own files (using folder path uuid)
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'invitation_media' AND 
  (auth.uid())::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invitation_media' AND 
  (auth.uid())::text = (string_to_array(name, '/'))[1]
);
