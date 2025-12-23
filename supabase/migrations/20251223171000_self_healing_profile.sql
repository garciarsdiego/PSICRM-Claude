-- Self-healing RPC: Allows a user strictly to create their own profile if missing
CREATE OR REPLACE FUNCTION public.create_my_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u auth.users%ROWTYPE;
BEGIN
  -- Get the current user data from auth.users
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  
  IF u.id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert profile if not exists
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    u.id, 
    u.email, 
    u.raw_user_meta_data->>'full_name', 
    COALESCE((u.raw_user_meta_data->>'role')::app_role, 'professional'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_my_profile() TO authenticated;
