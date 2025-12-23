-- Function to manually sync users from auth to profiles
-- This is useful if triggers failed or for existing users
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status, created_at)
  SELECT 
    au.id, 
    au.email,
    au.raw_user_meta_data->>'full_name',
    COALESCE((au.raw_user_meta_data->>'role')::public.app_role, 'professional'),
    'pending',
    au.created_at
  FROM auth.users au
  WHERE au.id NOT IN (SELECT id FROM public.profiles)
  ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Grant execute to authenticated users (or restrict to admin inside logic if preferred, 
-- but this is safe as it only creates missing profiles)
GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;
