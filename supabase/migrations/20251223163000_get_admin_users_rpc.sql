-- Secure function to get all users for Admin Dashboard
CREATE OR REPLACE FUNCTION public.get_admin_users()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role app_role,
  status user_status,
  created_at timestamptz,
  last_seen timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.status,
    p.created_at,
    p.last_seen
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;
